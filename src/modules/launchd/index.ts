//
// Init System
//

import type Net from 'iodine/modules/net';
import type Common from 'iodine/modules/common';

const { XHRGet } = kern_require<typeof Net>('net');
const { LitElement, html, unsafeCSS, customElement, createRef, ref } =
  kern_require<typeof Common>('common').third_party;

const globalStyleElement = kern_require<HTMLStyleElement>('global_style');
const bootstrapStyleElement = kern_require<HTMLStyleElement>('bootstrap_style');

@customElement('boot-screen')
class BootScreen extends LitElement {
  static override styles = unsafeCSS(bootstrapStyleElement.innerHTML);

  private objectURLs: string[];

  constructor() {
    super();

    this.objectURLs = [];

    this.applyGlobalStyles();
  }

  bootImgContainer = createRef<HTMLDivElement>();

  applyGlobalStyles() {
    document.head.appendChild(globalStyleElement);

    const theme = document.createElement('meta');
    theme.setAttribute('name', 'theme-color');
    theme.setAttribute('content', '#000');
    document.head.appendChild(theme);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    for (const url of this.objectURLs) {
      URL.revokeObjectURL(url);
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.loadAssets();
  }

  async loadAssets() {
    const [bootLogoRes, bootSoundRes] = await Promise.allSettled([
      new XHRGet('/assets/boot-logo.webp', 'blob', {
        Accept: 'image/webp'
      }).send(),

      new XHRGet('/assets/boot-sound.m4a', 'blob', {
        Accept: 'audio/mp4'
      }).send()
    ]);

    if (bootLogoRes.status === 'fulfilled') {
      const img = document.createElement('img');

      img.alt = 'Boot Logo';
      this.objectURLs.push((img.src = URL.createObjectURL(bootLogoRes.value)));

      this.bootImgContainer.value!.appendChild(img);
    }

    if (bootSoundRes.status === 'fulfilled') {
      const src = URL.createObjectURL(bootSoundRes.value);

      this.objectURLs.push(src);
      new Audio(src).play();
      this.bootImgContainer.value!.classList.add('show');
    }
  }

  protected override render() {
    return html`<div class="boot-container">
      <div class="boot-img" ${ref(this.bootImgContainer)}></div>
      <div class="boot-progress">
        <div class="boot-progress-bar"></div>
      </div>
    </div>`;
  }
}

document.body.appendChild(document.createElement('boot-screen'));
