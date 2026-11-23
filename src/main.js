import { createTilawa, prepareMicrophone } from '@tilawa/core/web';
import './style.css';

const start = document.querySelector('#start');
const stop = document.querySelector('#stop');
const status = document.querySelector('#status');
const position = document.querySelector('#position');
const flags = document.querySelector('#flags');
const download = document.querySelector('#download');
let engine;
let take;
let microphone;
let unsubscribe;
let loading = false;

// Production previews cache the app shell and the hosted runtime for offline reloads.
// Development keeps Vite's live modules untouched.
const offlinePreparation = import.meta.env.PROD && 'serviceWorker' in navigator
  ? navigator.serviceWorker.register('/sw.js').then(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      }
    })
  : Promise.resolve();
const review = new Map();
const labels = {
  wrong_word: 'A word sounded different',
  omitted_word: 'A word may have been missed',
  added_word: 'An extra word may have been recited',
  skipped_passage: 'A passage may have been skipped',
};

function describe(word) {
  return word ? `Surah ${word.surah}, ayah ${word.ayah}, word ${word.word}` : 'Location unavailable';
}
function renderReview() {
  flags.replaceChildren(...[...review.values()].map(event => {
    const row = document.createElement('li');
    row.textContent = `${labels[event.errorClass] ?? event.errorClass}: ${describe(event.location)}`;
    return row;
  }));
}
function observe(event) {
  if (event.type === 'position') {
    if (event.state === 'locked') {
      position.textContent = describe(event.expected ?? event.observed[0]?.word);
    } else {
      status.textContent = `Tracker: ${event.state}. Keep reciting at a comfortable pace.`;
    }
  }
  if (event.type === 'checker') {
    if (event.state === 'confirmed') review.set(event.id, event);
    if (event.state === 'resolved' || event.state === 'uncertain') review.delete(event.id);
    renderReview();
  }
}

start.addEventListener('click', async () => {
  if (loading || microphone) return;
  // Capture permission/audio setup in the user gesture, before a model download.
  let prepared;
  try {
    prepared = prepareMicrophone();
  } catch (error) {
    status.textContent = `Microphone setup needs HTTPS or localhost and a supported browser: ${error instanceof Error ? error.message : String(error)}`;
    return;
  }
  loading = true;
  start.disabled = true;
  review.clear();
  renderReview();
  position.textContent = 'Finding your place';
  try {
    await offlinePreparation;
    if (!engine) {
      engine = await createTilawa({
        tier: 'lite',
        onProgress: progress => {
          download.value = progress.fraction;
          status.textContent = `Preparing ${progress.stage}: ${Math.round(progress.fraction * 100)}%`;
        },
      });
    }
    take = engine.startMemorization({ surah: 1, fromAyah: 1, toAyah: 7 });
    unsubscribe = take.subscribe(observe);
    microphone = await engine.listen(take, { prepared });
    stop.disabled = false;
    status.textContent = `Listening on this device (${engine.model.backend}). Audio is not uploaded.`;
  } catch (error) {
    prepared.release();
    unsubscribe?.();
    take?.dispose();
    take = undefined;
    status.textContent = error?.reason === 'denied'
      ? 'Microphone permission was denied. Allow it in browser settings to try again.'
      : `Could not start: ${error instanceof Error ? error.message : String(error)}`;
    start.disabled = false;
  } finally {
    loading = false;
  }
});

stop.addEventListener('click', async () => {
  if (!microphone) return;
  stop.disabled = true;
  try {
    // Stopping the microphone also drains the take and decides its final flags.
    await microphone.stop();
    status.textContent = `Take finished. ${take.mistakes().length} confirmed flag(s) to review. A flag can be wrong.`;
  } catch (error) {
    status.textContent = `Could not finish the take: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    microphone = undefined;
    unsubscribe?.();
    take?.dispose();
    take = undefined;
    start.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  // Stop device capture when the page leaves; disposal releases the model too.
  void microphone?.stop().catch(() => {});
  void engine?.dispose();
});
