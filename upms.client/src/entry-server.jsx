import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App";
import { publicPages, publicPage } from "./data/publicRoutes";
export { publicPages };
export function render(path) {
  return { markup: renderToString(<StaticRouter location={path}><App /></StaticRouter>), meta: publicPage(path) };
}
