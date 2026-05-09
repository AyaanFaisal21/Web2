"use client";

import { forwardRef, useImperativeHandle, useEffect, useState, useCallback } from "react";

export type CardVariant = "dark" | "light";

interface CardTemplateProps {
  userName: string;
  variant: CardVariant;
  onTextureReady: (dataUrl: string) => void;
  bottomRole?: string;
}

export interface CardTemplateRef {
  captureTexture: () => Promise<void>;
  exportCard: () => void;
}

const CANVAS_SIZE = 1376;

const CardTemplate = forwardRef<CardTemplateRef, CardTemplateProps>(
  ({ userName, variant, onTextureReady, bottomRole = "Engineer" }, ref) => {
    const [headshotImage, setHeadshotImage] = useState<HTMLImageElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    const bgColor = variant === "dark" ? "#0a0a0a" : "#fafafa";
    const textColor = variant === "dark" ? "#ffffff" : "#000000";
    const subtleColor = variant === "dark" ? "#333333" : "#e5e5e5";
    const mutedColor = "#878787";

    // Preload the headshot image
    useEffect(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setHeadshotImage(img);
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Try again without crossOrigin for local development
        const img2 = new Image();
        img2.onload = () => {
          setHeadshotImage(img2);
          setImageLoaded(true);
        };
        img2.src = "/ayaan-headshot.jpg";
      };
      img.src = "/ayaan-headshot.jpg";
    }, []);

    const drawCard = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, img: HTMLImageElement | null) => {
      // The texture is split: left half = front, right half = back
      const halfWidth = width / 2;
      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // === FRONT OF CARD (Left half) ===
      
      // Draw "A.F." in top left in white
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 100px "Geist", sans-serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("A.F.", 50, 50);

      // Draw headshot image CENTERED on the front half (filling more space)
      // The card mesh face is roughly 1.6:2.25 (W:H ≈ 0.711) but the texture half is
      // 688:1376 (W:H = 0.5), so a square in texture space appears horizontally
      // stretched on the 3D card. Compensate by drawing the headshot taller than wide
      // in texture space so it renders visually square on the card.
      const cardPadding = 30;
      const aspectCompensation = 1.08; // tuned empirically against the GLB's UVs
      const availableWidth = halfWidth - (cardPadding * 2);
      // Center image vertically between A.F. text bottom (~150) and role text top (900)
      const topBound = 185;
      const bottomBound = 865;
      const availableHeight = bottomBound - topBound;
      let imageHeight = Math.min(680, availableHeight);
      let imageWidth = imageHeight / aspectCompensation;
      if (imageWidth > availableWidth) {
        imageWidth = availableWidth;
        imageHeight = imageWidth * aspectCompensation;
      }
      const imageX = (halfWidth - imageWidth) / 2;
      const imageY = topBound + (availableHeight - imageHeight) / 2;
      const radius = 16;
      
      // Draw rounded rectangle background for image area with faint white glow
      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = variant === "dark" ? "#111111" : "#f0f0f0";
      ctx.beginPath();
      ctx.moveTo(imageX + radius, imageY);
      ctx.lineTo(imageX + imageWidth - radius, imageY);
      ctx.quadraticCurveTo(imageX + imageWidth, imageY, imageX + imageWidth, imageY + radius);
      ctx.lineTo(imageX + imageWidth, imageY + imageHeight - radius);
      ctx.quadraticCurveTo(imageX + imageWidth, imageY + imageHeight, imageX + imageWidth - radius, imageY + imageHeight);
      ctx.lineTo(imageX + radius, imageY + imageHeight);
      ctx.quadraticCurveTo(imageX, imageY + imageHeight, imageX, imageY + imageHeight - radius);
      ctx.lineTo(imageX, imageY + radius);
      ctx.quadraticCurveTo(imageX, imageY, imageX + radius, imageY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(imageX + radius, imageY);
        ctx.lineTo(imageX + imageWidth - radius, imageY);
        ctx.quadraticCurveTo(imageX + imageWidth, imageY, imageX + imageWidth, imageY + radius);
        ctx.lineTo(imageX + imageWidth, imageY + imageHeight - radius);
        ctx.quadraticCurveTo(imageX + imageWidth, imageY + imageHeight, imageX + imageWidth - radius, imageY + imageHeight);
        ctx.lineTo(imageX + radius, imageY + imageHeight);
        ctx.quadraticCurveTo(imageX, imageY + imageHeight, imageX, imageY + imageHeight - radius);
        ctx.lineTo(imageX, imageY + radius);
        ctx.quadraticCurveTo(imageX, imageY, imageX + radius, imageY);
        ctx.closePath();
        ctx.clip();

        // Draw the source square image into a taller rect; the 3D card's horizontal
        // stretch then squashes it back to a visually square portrait.
        ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight);
        ctx.restore();
      }

      // Draw role label and name in bottom right corner (fixed position like A.F. in top left)
      // The visible card area is roughly the top 1042px (height - 334 crop), so position text above that
      const bottomRightX = halfWidth - 50;
      const bottomY = 900; // Position within visible card area
      
      // Role label (like "ATTENDEE" in original)
      ctx.fillStyle = mutedColor;
      ctx.font = '400 36px "Geist", sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(bottomRole.toUpperCase(), bottomRightX, bottomY);
      
      // Name below the role
      ctx.fillStyle = textColor;
      ctx.font = '600 48px "Geist", sans-serif';
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("AYAAN  FAISAL", bottomRightX, bottomY + 44);

      // === BACK OF CARD (Right half) ===
      
      // Draw "hey lol" centered on the back
      ctx.fillStyle = mutedColor;
      ctx.font = 'italic 60px "Geist", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("hey lol", halfWidth + halfWidth / 2, height / 2);
      
    }, [bgColor, textColor, mutedColor, variant, bottomRole]);

    const captureTexture = useCallback(async (img: HTMLImageElement | null = headshotImage) => {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;

      drawCard(ctx, CANVAS_SIZE, CANVAS_SIZE, img);

      const dataUrl = canvas.toDataURL("image/png");
      onTextureReady(dataUrl);
    }, [drawCard, headshotImage, onTextureReady]);

    // Regenerate texture when headshot loads
    useEffect(() => {
      if (imageLoaded && headshotImage) {
        captureTexture(headshotImage);
      }
    }, [imageLoaded, headshotImage, captureTexture]);

    const exportCard = useCallback(() => {
      const CROP_BOTTOM = 334;
      const EXPORT_HEIGHT = CANVAS_SIZE - CROP_BOTTOM;

      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = CANVAS_SIZE;
      fullCanvas.height = CANVAS_SIZE;
      const fullCtx = fullCanvas.getContext("2d");
      
      if (!fullCtx) return;

      drawCard(fullCtx, CANVAS_SIZE, CANVAS_SIZE, headshotImage);

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = CANVAS_SIZE;
      exportCanvas.height = EXPORT_HEIGHT;
      const exportCtx = exportCanvas.getContext("2d");

      if (!exportCtx) return;

      exportCtx.drawImage(
        fullCanvas,
        0, 0, CANVAS_SIZE, EXPORT_HEIGHT,
        0, 0, CANVAS_SIZE, EXPORT_HEIGHT
      );

      const dataUrl = exportCanvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `ayaan-faisal-card.png`;
      link.href = dataUrl;
      link.click();
    }, [drawCard, headshotImage]);

    useImperativeHandle(ref, () => ({
      captureTexture,
      exportCard,
    }));

    return null;
  }
);

CardTemplate.displayName = "CardTemplate";

export default CardTemplate;
