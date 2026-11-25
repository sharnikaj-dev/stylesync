import React, { useState } from 'react';
import { Download, Film, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, fileToDataUrl } from '../services/api';

const MOTION_PRESETS = [
  'Subtle atelier fashion motion: gentle breeze ripples the silk drape while warm natural sunlight shifts smoothly across the look.',
  'Editorial runway camera slowly dollies forward as the model turns slightly to showcase garment tailoring and fabric texture.',
  'Soft twilight evening ambiance with subtle fabric movement and natural studio lighting highlights.',
];

export const RunwayVideoView: React.FC = () => {
  const { notify } = useAuth();
  const [imageData, setImageData] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [prompt, setPrompt] = useState(MOTION_PRESETS[0]);
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageData(dataUrl);
      setVideoUrl(null);
      setErrorMsg(null);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleGenerateVideo = async () => {
    if (!imageData) {
      notify('Please upload a fashion or outfit photograph first.', 'error');
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    setVideoUrl(null);
    try {
      const res = await apiFetch<{ videoUrl: string; aspectRatio: string }>(
        '/api/ai/animate-video',
        {
          method: 'POST',
          body: JSON.stringify({ imageData, prompt, aspectRatio }),
        },
      );
      setVideoUrl(res.videoUrl);
      notify('Runway lookbook video generated.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Unable to generate video.';
      setErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-[#9D5C63] mb-1">
          Interactions API · gemini-omni-1.2-flash
        </p>
        <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
          Lookbook Photo-to-Video Studio
        </h1>
        <p className="text-sm text-[#57534E] mt-1 max-w-2xl">
          Upload an outfit photograph or lookbook portrait to animate fabric movement, drape, and
          atelier lighting into a 16:9 widescreen or 9:16 vertical reel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-2">
              1. Upload Starting Frame Photograph
            </label>
            <label className="block border-2 border-dashed border-[#D6CEC2] rounded-xl p-5 text-center hover:border-[#9D5C63] cursor-pointer bg-[#FAF8F5]">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
              />
              {imageData ? (
                <img
                  src={imageData}
                  alt="Starting frame"
                  className="max-h-56 mx-auto rounded-lg object-cover"
                />
              ) : (
                <div className="py-6">
                  <Upload className="w-6 h-6 mx-auto text-[#9D5C63] mb-2" />
                  <div className="text-sm font-medium text-[#1C1917]">Upload Photo</div>
                  <div className="text-xs text-[#57534E] mt-1">JPEG, PNG, or WebP</div>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-2">
              2. Video Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-[#FAF8F5] text-[#44403C] border-[#E2DBD0]'
                }`}
              >
                16:9 Landscape
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-[#FAF8F5] text-[#44403C] border-[#E2DBD0]'
                }`}
              >
                9:16 Portrait
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-2">
              3. Motion & Camera Direction
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {MOTION_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(preset)}
                  className="text-[11px] px-2.5 py-1 rounded bg-[#F2EDE6] text-[#44403C] hover:bg-[#EAE3D9] cursor-pointer"
                >
                  Preset {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateVideo}
            disabled={generating || !imageData}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] disabled:opacity-50 cursor-pointer"
          >
            <Film className="w-4 h-4" />
            {generating ? 'Rendering Runway Video...' : 'Animate Photo into Video'}
          </button>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E7E2DA] rounded-xl p-6 flex flex-col justify-center">
          {errorMsg && (
            <div className="mb-4 p-4 rounded-xl bg-[#FDF2F2] border border-[#E5B8B8] text-xs text-[#8B2E2E]">
              {errorMsg}
            </div>
          )}

          {videoUrl ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1C1917]">
                  Generated Runway Video ({aspectRatio})
                </span>
                <a
                  href={videoUrl}
                  download={`stylesync-runway-${aspectRatio.replace(':', 'x')}.mp4`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#F2EDE6] rounded-lg hover:bg-[#EAE3D9]"
                >
                  <Download className="w-3.5 h-3.5" /> Download MP4
                </a>
              </div>
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className={`w-full rounded-xl border border-[#E7E2DA] bg-black ${
                  aspectRatio === '9:16' ? 'max-h-[520px] mx-auto w-auto' : 'aspect-video'
                }`}
              />
            </div>
          ) : (
            <div className="py-16 text-center text-[#57534E]">
              <Film className="w-9 h-9 mx-auto opacity-40 mb-3" />
              <div className="text-sm font-medium text-[#1C1917]">
                {generating
                  ? 'Animating your photograph via Gemini Omni Flash...'
                  : 'Your generated video will appear here'}
              </div>
              <p className="text-xs max-w-md mx-auto mt-1">
                Supports 16:9 widescreen lookbooks and 9:16 vertical style reels powered by
                gemini-omni-1.2-flash.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
