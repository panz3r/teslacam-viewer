export class TeslaCamClip {
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

  getTitle() {
    const dateFormatted = this.getTimestamp();

    if (this.type !== "RecentClips") {
      return dateFormatted + " - " + this.city;
    } else {
      return dateFormatted;
    }
  }

  getTimestamp() {
    return Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "numeric",
    }).format(this.date);
  }

  getLocation() {
    return this.type !== "RecentClips" ? this.city : "";
  }

  getThumbnailUrl() {
    return URL.createObjectURL(this.thumbnailFile);
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
