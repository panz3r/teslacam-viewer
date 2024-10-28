const title = document.querySelector("div.title");

const fileBrowserInput = document.querySelector("input[type=file][id=fileBrowser]");

const availableClipsSelect = document.querySelector(".slt-available-clips");

const videos = document.querySelectorAll("video");
const backVideo = document.querySelector("video.back");
const frontVideo = document.querySelector("video.front");
const leftVideo = document.querySelector("video.left_repeater");
const rightVideo = document.querySelector("video.right_repeater");

const playPauseBtn = document.querySelector(".btn-play-pause");
const next = document.querySelector("button.next");
const previous = document.querySelector("button.previous");
const skip = document.querySelector("button.skip");
const autoPlayBtn = document.querySelector(".btn-autoplay");

const playbackRateBtns = document.querySelectorAll(".btn-playback-rate");

let clipFiles = [];
let currentClipIndex = -1;

let playbackRate = 1;
let playbackIsPaused = true;

class TeslaCamClip {
  type = "Unknown";
  date = null;
  city = "Unknown";
  thumbnailFile = null;

  frontVideos = [];
  backVideos = [];
  leftRepeaterVideos = [];
  rightRepeaterVideos = [];

  currentVideosIndex = -1;
  totalVideosCount = -1;

  constructor(type, date, city, files) {
    this.type = type;
    this.date = date;
    this.city = city;

    this.thumbnailFile = files.find((file) => file.name === "thumb.png");

    const sortedFiles = files.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }

      if (a.name > b.name) {
        return 1;
      }

      // names must be equal
      return 0;
    });

    this.frontVideos = sortedFiles.filter((file) => file.name.endsWith("-front.mp4"));
    this.backVideos = sortedFiles.filter((file) => file.name.endsWith("-back.mp4"));
    this.leftRepeaterVideos = sortedFiles.filter((file) => file.name.endsWith("-left_repeater.mp4"));
    this.rightRepeaterVideos = sortedFiles.filter((file) => file.name.endsWith("right_repeater.mp4"));

    this.totalVideosCount = Math.min(
      this.frontVideos.length,
      this.backVideos.length,
      this.leftRepeaterVideos.length,
      this.rightRepeaterVideos.length
    );
  }

  reset() {
    this.currentVideosIndex = -1;
  }

  getName() {
    const dateFormatted = Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "numeric",
    }).format(this.date);

    if (this.type !== "RecentClips") {
      return dateFormatted + " - " + this.city;
    } else {
      return dateFormatted;
    }
  }

  getCurrentVideos() {
    return {
      front: this.frontVideos[this.currentVideosIndex].webkitRelativePath,
      back: this.backVideos[this.currentVideosIndex].webkitRelativePath,
      left: this.leftRepeaterVideos[this.currentVideosIndex].webkitRelativePath,
      right: this.rightRepeaterVideos[this.currentVideosIndex].webkitRelativePath,
    };
  }

  getNextVideos() {
    this.currentVideosIndex += 1;
    if (this.currentVideosIndex >= this.totalVideosCount) {
      // reset Clip for next time
      this.reset();

      // return null to signal there are no more videos to play for this clip
      return null;
    }

    return this.getCurrentVideos();
  }

  /**
   *  @param clipType {string}
   *  @param fileList {File[]}
   */
  static async fromTeslaCamFileList(clipType, fileList) {
    if (clipType === "RecentClips") {
      return new TeslaCamClip(clipType, new Date(), "Unknown", fileList);
    }

    const eventJsonFile = fileList.find((file) => file.name === "event.json");
    if (!eventJsonFile) {
      // Invalid Clip folder - skip
      return null;
    }

    const eventJsonText = await eventJsonFile.text();
    const eventDetails = JSON.parse(eventJsonText);

    return new TeslaCamClip(clipType, new Date(eventDetails.timestamp), eventDetails.city, fileList);
  }
}

//
//  DOM UTILS
//

function playVideos() {
  videos.forEach((video) => {
    video.play();
    video.playbackRate = playbackRate;
  });
}

function setPlaybackRate(evt) {
  console.log(">> setPlaybackRate", evt);

  const selectedPlaybackRateBtn = evt.currentTarget;

  playbackRate = parseFloat(selectedPlaybackRateBtn.getAttribute("data-rate"));

  playbackRateBtns.forEach((playbackRateBtn) => playbackRateBtn.classList.remove("active"));
  selectedPlaybackRateBtn.classList.add("active");

  videos.forEach((video) => {
    video.playbackRate = playbackRate;
  });
}

function pauseVideos() {
  videos.forEach((video) => {
    video.pause();
  });
}

function playPause() {
  if (playbackIsPaused) {
    playVideos();
  } else {
    pauseVideos();
  }

  playbackIsPaused = !playbackIsPaused;

  updatePlayPauseButton();
}

function skipTo(seconds) {
  videos.forEach((video) => {
    video.currentTime += seconds;
  });
}

function isAutoPlayActive() {
  return autoPlayBtn.classList.contains("active");
}

function toggleAutoPlay() {
  autoPlayBtn.classList.toggle("active");
}

function updatePlayPauseButton() {
  playPauseBtn.querySelectorAll("svg").forEach((svg) => {
    svg.classList.toggle("hidden");
  });
}

//
//  APP LOGIC
//

function loadClip(clipIndex) {
  if (clipIndex < 0 || clipIndex >= clipFiles.length) {
    throw new Error("Invalid clip index selected");
  }

  console.debug(">>> loadClip:", clipFiles[clipIndex]);
  currentClipIndex = clipIndex;

  const isLoaded = loadClipVideos();
  videos.forEach((video) => {
    video.classList.toggle("hidden", !isLoaded);
  });
}

function loadPreviousClip() {
  currentClipIndex = Math.max(0, currentClipIndex - 1);
  loadClip(currentClipIndex);
}

function loadNextClip() {
  currentClipIndex = Math.min(currentClipIndex + 1, clipFiles.length);
  loadClip(currentClipIndex);
}

function loadClipVideos() {
  const currentClip = clipFiles[currentClipIndex];

  const currentClipVideos = currentClip.getNextVideos();
  if (!currentClipVideos) {
    return false;
  }

  frontVideo.src = currentClipVideos.front;
  leftVideo.src = currentClipVideos.left;
  rightVideo.src = currentClipVideos.right;
  backVideo.src = currentClipVideos.back;

  return true;
}

//
//  EVENT LISTENERS
//

//The following code uses webkitdirectory to get all the videos from a directory
fileBrowserInput.addEventListener("change", async function (e) {
  const files = e.currentTarget.files;

  // Group files by Folder and SubFolder
  const groupedFiles = {};
  for (const file of fileBrowserInput.files) {
    const filePathSegments = file.webkitRelativePath.split("/");

    const clipType = filePathSegments[1];
    const clipFolderName = filePathSegments[2];

    if (clipType === "RecentClips") {
      groupedFiles[clipType] = [...(groupedFiles[clipType] || []), file];
    } else {
      const clipsGroup = groupedFiles[clipType] || {};

      groupedFiles[clipType] = {
        ...clipsGroup,
        [clipFolderName]: [...(clipsGroup[clipFolderName] || []), file],
      };
    }
  }

  console.debug(">>> groupedFiles", groupedFiles);

  // create TeslaCamClips from files lists
  const tcClips = [];
  for await (const clipType of Object.keys(groupedFiles)) {
    console.log(">>> clipType", clipType);
    console.log(">>> clips", groupedFiles[clipType]);

    if (clipType === "RecentClips") {
      const tcClip = await TeslaCamClip.fromTeslaCamFileList(clipType, groupedFiles[clipType]);
      if (!!tcClip) {
        tcClips.push(tcClip);
      }
    } else {
      for await (const clipFolder of Object.keys(groupedFiles[clipType])) {
        const tcClip = await TeslaCamClip.fromTeslaCamFileList(clipType, groupedFiles[clipType][clipFolder]);
        if (!!tcClip) {
          tcClips.push(tcClip);
        }
      }
    }
  }

  // sort Clips by event date (descending)
  tcClips.sort((a, b) => b.date - a.date);

  console.debug(">>> tcClips", tcClips);

  // group Clips by type to ease rendering
  const clipsByType = tcClips.reduce((byType, clip, clipIndex) => {
    return {
      ...byType,
      [clip.type]: [...(byType[clip.type] || []), clipIndex],
    };
  }, {});

  console.debug(">>> tcClipsByType", clipsByType);

  availableClipsSelect.innerHTML = null;

  Object.keys(clipsByType).forEach((clipType) => {
    const selectOptionsGroup = document.createElement("optgroup");
    selectOptionsGroup.label = clipType;

    clipsByType[clipType].forEach((clipIndex) => {
      const clip = tcClips[clipIndex];

      const selectOption = document.createElement("option");
      selectOption.label = clip.getName();
      selectOption.value = clipIndex;

      selectOptionsGroup.appendChild(selectOption);
    });

    availableClipsSelect.appendChild(selectOptionsGroup);
  });

  clipFiles = tcClips;

  loadClip(0);
});

availableClipsSelect.addEventListener("change", (evt) => {
  console.log(">>> availableClipsSelect - onChange", evt);

  const selectClipIndex = parseInt(availableClipsSelect.options[evt.currentTarget.selectedIndex].value);

  loadClip(selectClipIndex);
});

playPauseBtn.addEventListener("click", playPause);

previous.addEventListener("click", loadPreviousClip);

next.addEventListener("click", loadNextClip);

autoPlayBtn.addEventListener("click", toggleAutoPlay);

playbackRateBtns.forEach((playbackRateBtn) => {
  playbackRateBtn.addEventListener("click", setPlaybackRate);
});

//Add listeners for play, pause and click buttons for each video.
videos.forEach((video) => {
  video.addEventListener("play", function (e) {
    console.debug(">>> video - onPlay", e);

    playVideos();
  });

  video.addEventListener("pause", function (evt) {
    console.debug(">>> video - onPause", evt);

    if (!evt.currentTarget.ended) {
      pauseVideos();
    }
  });

  video.addEventListener("click", function (e) {
    console.debug(">>> video - onClick", e);

    const currentVideo = e.target;

    const currentTime = currentVideo.currentTime;

    if (currentVideo != frontVideo) {
      frontVideo.currentTime = currentTime;
    }
    if (currentVideo != leftVideo) {
      leftVideo.currentTime = currentTime;
    }
    if (currentVideo != rightVideo) {
      rightVideo.currentTime = currentTime;
    }
    if (currentVideo != backVideo) {
      backVideo.currentTime = currentTime;
    }

    const enlargeCurrentVideo = !currentVideo.classList.contains("fullscreen");

    videos.forEach((video) => {
      video.classList.remove("fullscreen");
    });

    if (enlargeCurrentVideo) {
      currentVideo.classList.add("fullscreen");
    }
  });
});

frontVideo.addEventListener("canplaythrough", function (evt) {
  console.debug(">>> frontVideo - onCanPlayThrough", evt, playbackIsPaused);

  if (!playbackIsPaused) {
    playVideos();
  }
});

frontVideo.addEventListener("ended", function (evt) {
  console.debug(">>> frontVideo - onEnded", evt);

  const hasNext = loadClipVideos();
  // instead of going to next video go to next clip if autoplay is active
  if (!hasNext && isAutoPlayActive()) {
    loadNextClip();
  } else if (!hasNext) {
    playbackIsPaused = true;
  }
});
