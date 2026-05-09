"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Lanyard from "@/components/ui/lanyard";
import CardTemplate, { type CardTemplateRef, type CardVariant } from "@/components/card-template";


interface LanyardWithControlsProps {
  position?: [number, number, number];
  containerClassName?: string;
  defaultName?: string;
  defaultVariant?: CardVariant;
}

export default function LanyardWithControls({
  position = [0, 0, 20],
  containerClassName,
  defaultName = "A.F.",
  defaultVariant = "dark",
}: LanyardWithControlsProps) {
  const [bottomRole, setBottomRole] = useState<string>("Visionary, Architect, Builder");
  const [appliedName] = useState(defaultName);
  const [cardVariant] = useState<CardVariant>(defaultVariant);
  const [appliedVariant] = useState<CardVariant>(defaultVariant);
  const [cardTextureUrl, setCardTextureUrl] = useState<string | undefined>(undefined);
  const [textureKey, setTextureKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const cardTemplateRef = useRef<CardTemplateRef>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  
  // Auto-capture texture when component mounts
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cardTemplateRef.current) {
        await cardTemplateRef.current.captureTexture();
      }
      setIsInitialized(true);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [bottomRole]);

  const handleTextureReady = useCallback((dataUrl: string) => {
    setCardTextureUrl(dataUrl);
    setTextureKey((prev) => prev + 1);
  }, []);

  // Show loading spinner while waiting for initialization
  if (!isInitialized) {
    return (
      <div className="flex flex-col w-full h-full">
        <CardTemplate
          ref={cardTemplateRef}
          userName={appliedName}
          variant={cardVariant}
          onTextureReady={handleTextureReady}
          bottomRole={bottomRole}
        />
        <div className={containerClassName}>
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      {/* Hidden card template for texture generation */}
      <CardTemplate
        ref={cardTemplateRef}
        userName={appliedName}
        variant={cardVariant}
        onTextureReady={handleTextureReady}
        bottomRole={bottomRole}
      />
      <Lanyard
        key={textureKey}
        position={position}
        containerClassName={containerClassName}
        cardTextureUrl={cardTextureUrl}
        canvasRef={canvasRef}
      />
    </div>
  );
}
