/**
 * 圖片生成自訂 Hook — Shopee Edition
 * 對接 imageGenService.generateImage()，使用 image-2 API
 */

import { useState, useCallback } from 'react';
import { generateImage, b64JsonToDataUri } from '../services/imageGenService';
import { AppError } from '../utils/errorHandler';
import type { ImageGenerationParams } from '../types/shopee';

type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | '2048x2048';

interface UseImageGenerationReturn {
  image: string | null;
  loading: boolean;
  error: string | null;
  generate: (
    prompt: string,
    size: ImageSize,
    refImageBase64?: string,
    cacheContext?: string,
  ) => Promise<void>;
  clearImage: () => void;
}

export const useImageGeneration = (): UseImageGenerationReturn => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      prompt: string,
      size: ImageSize,
      refImageBase64?: string,
      cacheContext: string = 'shopee',
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params: ImageGenerationParams = {
          model: 'gpt-image-2',
          prompt,
          n: 1,
          size,
          quality: 'medium',
          output_format: 'png',
        };

        if (refImageBase64) {
          params.image = refImageBase64;
        }

        const result = await generateImage({ params });

        let imageData: string;
        if (result.b64Json) {
          imageData = b64JsonToDataUri(result.b64Json);
        } else if (result.url) {
          imageData = result.url;
        } else {
          throw new Error('No image data in response');
        }

        setImage(imageData);
      } catch (err) {
        if (err instanceof AppError) {
          setError(err.userMessage);
        } else {
          setError('圖片生成失敗，請稍候再試。');
        }
        setImage(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clearImage = useCallback(() => {
    setImage(null);
    setError(null);
  }, []);

  return { image, loading, error, generate, clearImage };
};
