import wisp from "wisp-server-node"
import { createBareServer } from "@tomphttp/bare-server-node"
import { uvPath } from "@titaniumnetwork-dev/ultraviolet"
import { epoxyPath } from "@mercuryworkshop/epoxy-transport"
import { bareModulePath } from "@mercuryworkshop/bare-as-module3"
import { baremuxPath } from "@mercuryworkshop/bare-mux/node"
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const fs = require('fs').promises;
const path = require('path');

async function injectEmbeddingChecker(htmlContent) {
  const scriptToInject = `
<script>
class EmbeddingChecker {
  constructor() {
    this.embeddedStatus = null;
    this.redirectUrl = 'https://www.google.com';
    this.checkInterval = 100;
    this.maxChecks = 50;
    this.checkCount = 0;
  }
  async isEmbedded() {
    return new Promise((resolve) => {
      const check = () => {
        if (window !== window.top) {
          resolve(true);
        } else if (++this.checkCount >= this.maxChecks) {
          resolve(false);
        } else {
          setTimeout(check, this.checkInterval);
        }
      };
      check();
    });
  }
  async performRedirect() {
    return new Promise((resolve) => {
      setTimeout(() => {
        window.location.href = this.redirectUrl;
        resolve();
      }, 1000);
    });
  }
  logStatus(message) {
    console.log(\`%c\${message}\`, 'color: blue; font-weight: bold;');
  }
  async checkEmbedding() {
    try {
      this.embeddedStatus = await this.isEmbedded();
      if (this.embeddedStatus) {
        this.logStatus("Website is embedded.");
        document.body.style.opacity = '1';
      } else {
        this.logStatus("...oh");
        document.body.style.opacity = '0';
        await this.performRedirect();
      }
    } catch (error) {
      console.error("An error occurred during embedding check:", error);
    }
  }
}
const embeddingChecker = new EmbeddingChecker();
window.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease-in-out';
  embeddingChecker.checkEmbedding();
});
</script>
`;
  const injectedHtml = htmlContent.replace('</body>', `${scriptToInject}</body>`);
  return injectedHtml;
}

async function processHtmlFiles(directory) {
  const files = await fs.readdir(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isDirectory()) {
      await processHtmlFiles(filePath);
    } else if (path.extname(file).toLowerCase() === '.html') {
      const content = await fs.readFile(filePath, 'utf-8');
      const injectedContent = await injectEmbeddingChecker(content);
      await fs.writeFile(filePath, injectedContent, 'utf-8');
      console.log(`Processed: ${filePath}`);
    }
  }
}

const siteDirectory = '/path/to/your/site/directory';
processHtmlFiles(siteDirectory)
  .then(() => console.log('...yes'))
  .catch(error => console.error('My nutsack kinda itches:', error));

const bare = createBareServer("/bare/")
const __dirname = join(fileURLToPath(import.meta.url), "..");
const app = express();
const publicPath = "public";

app.use(express.static(publicPath));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/baremod/", express.static(bareModulePath));

app.use((req, res) => {
    res.status(404);
    res.sendFile(join(__dirname, publicPath, "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on("upgrade", (req, socket, head) => {
    if (req.url.endsWith("/wisp/")) {
        wisp.routeRequest(req, socket, head);
    } else if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

server.on("listening", () => {
    const address = server.address();
    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(
        `\thttp://${
            address.family === "IPv6" ? `[${address.address}]` : address.address
        }:${address.port}`
    );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close();
    bare.close();
    process.exit(0);
}

server.listen({
    port,
});
