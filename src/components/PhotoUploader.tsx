import { useRef, useState } from 'react';

interface Props {
  onCapture: (dataUrl: string) => void;
  value?: string;
}

export function PhotoUploader({ onCapture, value }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const url = reader.result as string;
      setPreview(url);
      onCapture(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full aspect-[4/3] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 active:bg-gray-100 overflow-hidden"
      >
        {preview ? (
          <img src={preview} alt="촬영 미리보기" className="w-full h-full object-cover" />
        ) : (
          <>
            <span className="text-5xl">📷</span>
            <span className="text-base font-semibold text-gray-700">사진 촬영</span>
            <span className="text-xs text-gray-400">현장 실촬영만 가능</span>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
    </>
  );
}
