import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Public landing pages (must come before SPA fallback)
import { renderPublicPage, previewPage } from "./routes/public-pages";
app.get("/p/:slug", renderPublicPage);
app.post("/api/funnel-pages/:id/preview", previewPage);

// Serve the built React frontend for all non-API routes
const frontendDist = path.resolve(__dirname, "../../marketing-agent/dist/public");
app.use(express.static(frontendDist));
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

export default app;
