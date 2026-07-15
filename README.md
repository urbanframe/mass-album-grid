# Music Assistant Album Grid

A deliberately minimal custom Lovelace card for [Home Assistant](https://www.home-assistant.io/) and [Music Assistant](https://music-assistant.io/).

It shows every album in your Music Assistant library as a grid of artwork. Tapping an album starts it playing on the media players you've configured. That's it — no transport controls, no volume, no queue management. Just a wall of albums and one tap to play.

## Features

- Displays your **entire** Music Assistant album library (paginated fetching, so large libraries work fine)
- One tap/click plays the album on **one or more** media players at once
- Responsive grid that adapts to card width, or a fixed column count if you prefer
- Album name and artist shown under each cover, with a placeholder tile for albums without artwork
- Follows your Home Assistant theme (light/dark)
- Keyboard accessible — tab to an album, press Enter or Space to play
- Optional favourites-only mode
- Visual editor — configure entirely through the Lovelace UI, no YAML required
- Zero dependencies, single file, no build step

## Requirements

- Home Assistant with the [Music Assistant](https://www.home-assistant.io/integrations/music_assistant/) integration installed and configured
- Music Assistant player entities (the `media_player` entities *provided by Music Assistant* — see note below)

## Installation

1. Download `mass-album-grid.js` and copy it to your Home Assistant `config/www/` folder (create the folder if it doesn't exist).

2. Register it as a dashboard resource. Either:

   **Via the UI:** Settings → Dashboards → ⋮ (top-right menu) → Resources → Add resource
   - URL: `/local/mass-album-grid.js`
   - Resource type: **JavaScript module**

   **Or via YAML** (if you manage Lovelace in YAML mode):

   ```yaml
   lovelace:
     resources:
       - url: /local/mass-album-grid.js
         type: module
   ```

3. Hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R). On the mobile companion app: Settings → Companion app → Debugging → Reset frontend cache, then restart the app.

The card then appears in the card picker as **Music Assistant Album Grid**, with a visual editor for setup — or you can configure it manually with YAML.

## Configuration

The card has a built-in UI editor: add it from the card picker and fill in the form (pick your media players, optional title, columns, favourites-only, etc.). Click **Edit card** on any existing instance to change settings the same way.

For YAML mode, minimal config:

```yaml
type: custom:mass-album-grid
entities:
  - media_player.kitchen
  - media_player.living_room
```

All options:

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `entities` | list | **yes** | — | One or more Music Assistant `media_player` entities to play the album on. A single string also works. |
| `title` | string | no | none | Optional card header. |
| `columns` | number | no | responsive | Fixed number of grid columns. When omitted, the grid auto-fills based on available width (min tile width ~112px). |
| `favorites_only` | boolean | no | `false` | Only show albums marked as favourites in Music Assistant. |
| `config_entry_id` | string | no | auto-detected | Only needed if you run more than one Music Assistant instance. |

Full YAML example:

```yaml
type: custom:mass-album-grid
title: Albums
entities:
  - media_player.kitchen
  - media_player.living_room
columns: 5
favorites_only: true
```

### ⚠️ Use Music Assistant player entities

The card calls the `music_assistant.play_media` action, which only works on the media players **exposed by Music Assistant itself** — not the underlying Chromecast, Sonos, AirPlay, etc. entities those players are built from. If tapping an album produces an error saying the entity is not a Music Assistant player, swap it for its MA counterpart (Settings → Devices & Services → Music Assistant lists them).

When multiple entities are configured, the album starts playing on each of them (each player gets its own queue). To play in sync, point the card at a Music Assistant player group instead.

## How it works

On load the card:

1. Finds your Music Assistant config entry automatically (via the `config_entries/get` WebSocket API), unless `config_entry_id` is set.
2. Fetches the full album library with the `music_assistant.get_library` action, 250 albums per page, sorted by name.
3. Renders the grid. Tapping a tile calls `music_assistant.play_media` with the album's URI, targeting your configured entities.

The library is fetched once per page load. Refresh the page to pick up newly added albums.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Custom element doesn't exist: mass-album-grid" | The resource isn't loaded — check the resource URL and type (`module`), then hard-refresh. |
| Card not in the picker | Custom cards are listed at the bottom of the Add Card dialog; search for "album". Hard-refresh first. |
| "No Music Assistant integration found" | Install/configure the Music Assistant integration in Home Assistant. |
| Tap does nothing / error about the player | You're targeting a non-MA entity — use the Music Assistant player entities (see above). |
| New albums missing | The library loads once per page view — refresh the page. |

## License

MIT — do what you like with it.
