import React, { useState } from 'react';
import { X, Wand2, RefreshCw } from 'lucide-react';
import { SoundEvent } from '../types';

interface EditSoundModalProps {
  event: SoundEvent;
  onClose: () => void;
  onRegenerate: (eventId: string, feedback: string) => void;
  isRegenerating: boolean;
}

const EditSoundModal: React.FC<EditSoundModalProps> = ({
  event,
  onClose,
  onRegenerate,
  isRegenerating
}) => {
  const [feedback, setFeedback] = useState('');

  const quickFixes = [
    "Make it louder and more impactful",
    "Make it softer and more subtle",
    "Add more bass/low frequencies",
    "Make it shorter in duration",
    "Make it longer in duration",
    "More realistic, less cartoonish",
    "More stylized, match the vibe better",
    "Different material texture"
  ];

  const handleSubmit = () => {
    if (feedback.trim()) {
      onRegenerate(event.id, feedback);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Edit Sound</h2>
              <p className="text-white/70 text-sm">[{event.timestamp}] {event.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Sound Info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Current Sound Query</p>
            <p className="text-sm text-slate-700">{event.layers?.spot || event.description}</p>
          </div>

          {/* Quick Fix Buttons */}
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Quick Adjustments</p>
            <div className="flex flex-wrap gap-2">
              {quickFixes.map((fix) => (
                <button
                  key={fix}
                  onClick={() => setFeedback(prev => prev ? `${prev}. ${fix}` : fix)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full text-xs text-slate-600 transition-colors border border-slate-200"
                >
                  {fix}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Feedback */}
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Your Feedback</p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Describe how you want this sound to change..."
              className="w-full h-24 p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!feedback.trim() || isRegenerating}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Regenerate Sound
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSoundModal;
