/**
 * Music Assistant Album Grid
 * A minimal Lovelace card: shows every album in your Music Assistant
 * library as a grid of artwork. Tapping an album plays it on the
 * configured media_player entities. No other controls.
 *
 * Example config:
 *   type: custom:mass-album-grid
 *   entities:
 *     - media_player.living_room
 *     - media_player.kitchen
 *   # optional:
 *   # title: Albums
 *   # columns: 4              (fixed column count; default is responsive)
 *   # favorites_only: true    (only favourited albums)
 *   # config_entry_id: xxxx   (only needed with multiple MA instances)
 */

class MassAlbumGrid extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._albums = null;
    this._loading = false;
    this._error = null;
  }

  setConfig(config) {
    const entities = config.entities
      ? Array.isArray(config.entities) ? config.entities : [config.entities]
      : config.entity ? [config.entity] : null;
    if (!entities || entities.length === 0) {
      throw new Error(
        'mass-album-grid: define one or more media_player entities under "entities"'
      );
    }
    this._config = { ...config, entities };
    // Config changed: force a reload next time hass is set
    this._albums = null;
    this._error = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._albums && !this._loading && !this._error) {
      this._loadAlbums();
    }
  }

  async _loadAlbums() {
    if (!this._hass) return;
    this._loading = true;
    this._render();
    try {
      let entryId = this._config.config_entry_id;
      if (!entryId) {
        const entries = await this._hass.callWS({
          type: "config_entries/get",
          domain: "music_assistant",
        });
        if (!entries || entries.length === 0) {
          throw new Error("No Music Assistant integration found");
        }
        entryId = entries[0].entry_id;
      }

      const pageSize = 250;
      const all = [];
      let offset = 0;
      for (;;) {
        const resp = await this._hass.callWS({
          type: "call_service",
          domain: "music_assistant",
          service: "get_library",
          service_data: {
            config_entry_id: entryId,
            media_type: "album",
            limit: pageSize,
            offset,
            order_by: "sort_name",
            ...(this._config.favorites_only ? { favorite: true } : {}),
          },
          return_response: true,
        });
        const r = (resp && resp.response) || {};
        const items = r.items || r.albums || [];
        all.push(...items);
        if (items.length < pageSize || all.length >= 10000) break;
        offset += pageSize;
      }
      this._albums = all;
    } catch (e) {
      this._error = (e && (e.message || e.error)) || String(e);
    }
    this._loading = false;
    this._render();
  }

  _playAlbum(album, tileEl) {
    if (!this._hass || !album || !album.uri) return;
    this._hass.callService("music_assistant", "play_media", {
      entity_id: this._config.entities,
      media_id: album.uri,
      media_type: "album",
    });
    if (tileEl) {
      tileEl.classList.add("playing");
      setTimeout(() => tileEl.classList.remove("playing"), 1200);
    }
  }

  _esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  _render() {
    if (!this.shadowRoot) return;
    const cols = this._config && this._config.columns;
    const gridCss = cols
      ? `grid-template-columns: repeat(${Number(cols)}, 1fr);`
      : "grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));";

    let body;
    if (this._error) {
      body = `<div class="msg error">Couldn't load albums: ${this._esc(this._error)}</div>`;
    } else if (this._loading || !this._albums) {
      body = `<div class="msg">Loading albums…</div>`;
    } else if (this._albums.length === 0) {
      body = `<div class="msg">No albums in your Music Assistant library.</div>`;
    } else {
      const tiles = this._albums
        .map((a, i) => {
          const artist = (a.artists || []).map((x) => x.name).join(", ");
          const img = a.image
            ? `<img loading="lazy" src="${this._esc(a.image)}" alt="">`
            : `<div class="noart"><span>&#9835;</span></div>`;
          return `
            <div class="album" data-idx="${i}" role="button" tabindex="0"
                 aria-label="Play ${this._esc(a.name)}${artist ? " by " + this._esc(artist) : ""}">
              <div class="art">${img}<div class="overlay">&#9654;</div></div>
              <div class="name">${this._esc(a.name)}</div>
              <div class="artist">${this._esc(artist)}</div>
            </div>`;
        })
        .join("");
      body = `<div class="grid">${tiles}</div>`;
    }

    const header = this._config && this._config.title
      ? `<h1 class="card-header">${this._esc(this._config.title)}</h1>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { overflow: hidden; }
        .card-header { padding: 12px 16px 0; font-size: 1.2em; }
        .wrap { padding: 12px; }
        .grid { display: grid; ${gridCss} gap: 12px; }
        .album { cursor: pointer; outline: none; }
        .art {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          background: var(--secondary-background-color, #333);
        }
        .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .noart {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 2.2em; color: var(--secondary-text-color);
          background: linear-gradient(135deg,
            var(--secondary-background-color, #333),
            var(--divider-color, #555));
        }
        .overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 2em; color: #fff;
          background: rgba(0,0,0,0.45);
          opacity: 0; transition: opacity 120ms ease;
        }
        .album:hover .overlay,
        .album:focus-visible .overlay,
        .album.playing .overlay { opacity: 1; }
        .album.playing .art { box-shadow: 0 0 0 3px var(--primary-color); }
        .album:focus-visible .art { box-shadow: 0 0 0 3px var(--primary-color); }
        .name {
          margin-top: 6px;
          font-size: 0.85em; font-weight: 500; line-height: 1.25;
          color: var(--primary-text-color);
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }
        .artist {
          font-size: 0.75em; color: var(--secondary-text-color);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .msg { padding: 24px 8px; text-align: center; color: var(--secondary-text-color); }
        .msg.error { color: var(--error-color, #db4437); }
      </style>
      <ha-card>
        ${header}
        <div class="wrap">${body}</div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".album").forEach((el) => {
      const album = this._albums && this._albums[Number(el.dataset.idx)];
      const go = () => this._playAlbum(album, el);
      el.addEventListener("click", go);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          go();
        }
      });
    });
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  static getStubConfig() {
    return { entities: ["media_player.example"] };
  }

  static getConfigElement() {
    return document.createElement("mass-album-grid-editor");
  }
}

class MassAlbumGridEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  get _schema() {
    return [
      {
        name: "entities",
        selector: { entity: { multiple: true, filter: { domain: "media_player" } } },
      },
      { name: "title", selector: { text: {} } },
      { name: "columns", selector: { number: { min: 1, max: 12, mode: "box" } } },
      { name: "favorites_only", selector: { boolean: {} } },
      { name: "config_entry_id", selector: { text: {} } },
    ];
  }

  _computeLabel(schema) {
    const labels = {
      entities: "Media player entities",
      title: "Title (optional)",
      columns: "Columns (optional, default responsive)",
      favorites_only: "Favourites only",
      config_entry_id: "Music Assistant config entry ID (advanced, only needed with multiple instances)",
    };
    return labels[schema.name] || schema.name;
  }

  _valueChanged(ev) {
    const config = { ...ev.detail.value };
    if (!config.title) delete config.title;
    if (!config.columns) delete config.columns;
    if (!config.config_entry_id) delete config.config_entry_id;
    if (!config.favorites_only) delete config.favorites_only;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _render() {
    if (!this._hass || !this._config) return;
    this.innerHTML = "";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema;
    form.computeLabel = this._computeLabel;
    form.addEventListener("value-changed", (ev) => this._valueChanged(ev));
    this.appendChild(form);
  }
}

customElements.define("mass-album-grid", MassAlbumGrid);
customElements.define("mass-album-grid-editor", MassAlbumGridEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "mass-album-grid",
  name: "Music Assistant Album Grid",
  description:
    "Grid of every Music Assistant album. Tap one to play it on your chosen players.",
});
