//
// Init System
//

const { XHRHead, XHRGet } = require("net")

initUI()

function initUI() {
  const globalStyleElement = require("global_style")

  document.head.appendChild(globalStyleElement)

  const theme = document.createElement("meta")
  theme.setAttribute("name", "theme-color")
  theme.setAttribute("content", "#000")
  document.head.appendChild(theme)
}
