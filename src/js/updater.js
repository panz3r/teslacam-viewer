export async function checkForUpdates() {
  let repositoryLink = document.querySelector("#repository-link").getAttribute("href");
  console.debug(">> repository link:", repositoryLink);

  let repositoryName = repositoryLink.split("/").slice(-2).join("/");
  console.debug(">> repository name:", repositoryName);

  let repositoryReleaseResponse = await fetch("https://api.github.com/repos/" + repositoryName + "/releases/latest");
  let repositoryLatestRelease = await repositoryReleaseResponse.json();
  console.debug(">> repository latest release:", repositoryLatestRelease);

  if (!repositoryLatestRelease.tag_name) {
    console.error(">>> Error retrieving latest release from GitHub:", repositoryLatestRelease.message);
    return;
  }

  let currentRelease = document.querySelector(".version").textContent;
  console.debug(">> current release:", currentRelease);

  if (currentRelease !== repositoryLatestRelease.tag_name) {
    console.debug(">> new release available:", repositoryLatestRelease.tag_name);
    document.querySelector(".btn-info-popup-open").classList.add("badge-visible");

    document.querySelector("#update-banner").classList.remove("hidden");

    let repositoryReleaseLink = document.querySelector("#repository-release");
    repositoryReleaseLink.textContent = repositoryLatestRelease.tag_name;
    repositoryReleaseLink.setAttribute("href", repositoryLatestRelease.html_url);
  }
}
