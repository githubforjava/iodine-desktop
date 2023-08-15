//
// Init System
//
import type Net from 'iodine/modules/net';
const { XHRHead, XHRGet } = kern_require<typeof Net>('net');

initUI();

function initUI() {
  const globalStyleElement = kern_require<HTMLStyleElement>('global_style');

  document.head.appendChild(globalStyleElement);

  const theme = document.createElement('meta');
  theme.setAttribute('name', 'theme-color');
  theme.setAttribute('content', '#000');
  document.head.appendChild(theme);
}
