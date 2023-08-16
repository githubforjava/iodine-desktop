//
// Init System
//

import type Net from 'iodine/modules/net';
import type Common from 'iodine/modules/common';

const { XHRGet } = kern_require<typeof Net>('net');
const { LitElement, css, html, unsafeCSS, customElement, createRef, ref } =
  kern_require<typeof Common>('common').third_party;

const globalStyleElement = kern_require<HTMLStyleElement>('global_style');

@customElement('boot-screen')
class BootScreen extends LitElement {
  static override styles = css`
    ${unsafeCSS(globalStyleElement.innerHTML)}

    .boot-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px 0;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    .boot-img {
      width: 140px;
      height: 192px;
      margin-bottom: 20px;
      transform: perspective(40px) rotate3d(0, 1, 0, 10deg) translateZ(45px);
      opacity: 0;
    }

    .boot-img.show {
      animation: showLogo 1s 1s ease-out forwards;
    }

    @keyframes showLogo {
      from {
        opacity: 1;
      }
      to {
        opacity: 1;
        transform: perspective(70px) rotate3d(0, 1, 0, 0deg) translateZ(0px);
      }
    }

    .boot-img img {
      width: 100%;
      height: 100%;
      filter: invert(1);
      -webkit-filter: invert(1);
      object-fit: contain;
    }

    .boot-progress {
      width: 280px;
      height: 5px;
      border: 1px solid rgba(240, 240, 240, 0.3);
      border-radius: 4px;
      overflow: hidden;
    }

    .boot-progress-bar {
      width: 0;
      height: 100%;
      background-color: rgb(240, 240, 240);
    }

    .boot-msg {
      color: rgb(200, 200, 200);
      font-size: 14px;
    }
  `;

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
