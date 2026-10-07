import { Innertube, ClientType } from 'youtubei.js';
const yt = await Innertube.create({
  client_type: ClientType.ANDROID_VR,
  generate_session_locally: true,
  cache: { cache_dir: '', get: async () => undefined, set: async () => {}, remove: async () => {} },
});
const info = await yt.getBasicInfo('lHC_pKJKKg8');
const sd = info.streaming_data || {};
const formats = sd.adaptive_formats || [];
const f = formats.find((x) => x.itag === 140 || (x.mime_type || '').startsWith('audio/mp4'));
if (f) { console.log(JSON.stringify({ itag: f.itag, mime: f.mime_type, url: f.url })); }
else { console.log(JSON.stringify({ adaptive: formats.length, sample: JSON.stringify(sd).slice(0, 300) })); }
