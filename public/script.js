
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const protocol = location.protocol === "https:" ? "https" : "http";
const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const wispUrl = `${wsProtocol}://${location.host}/wisp/`;
const bareUrl = `${protocol}://${location.host}/bare/`;
const urlInput = document.getElementById("urlInput");
const searchButton = document.getElementById("searchButton");
const iframeWindow = document.querySelector(".iframeWindow");
const switcher = document.getElementById("switcher");

const handleUrlSubmission = async () => {
    let url = urlInput.value.trim();
    const searchUrl = "https://www.google.com/search?q=";
    if (!url.includes(".")) {
        url = searchUrl + encodeURIComponent(url);
    } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
    }
    if (!await connection.getTransport()) {
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
    iframeWindow.src = __uv$config.prefix + __uv$config.encodeUrl(url);
};

urlInput.addEventListener("keydown", (event) => {
    if (event.key == "Enter") {
        event.preventDefault();
        handleUrlSubmission();
    }
});

searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    handleUrlSubmission();
});

switcher.addEventListener("change", async (event) => {
    const transportMap = {
        "epoxy": ["/epoxy/index.mjs", [{ wisp: wispUrl }]],
        "bare": ["/baremod/index.mjs", [bareUrl]]
    };
    const selectedTransport = transportMap[event.target.value];
    if (selectedTransport) {
        await connection.setTransport(...selectedTransport);
    }
});
