import "./style.css";
import { App } from "./ui/app";
import { installDiagnostics } from "./ui/diagnostics";

installDiagnostics();

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root element.");
new App(root);
