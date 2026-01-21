
import { createClient } from '@supabase/supabase-js';
import imageCompression from 'browser-image-compression';

// 修正說明：
// 為了避免 "Cannot read properties of undefined" 錯誤，我們加入安全檢查。
// 如果環境變數 (import.meta.env) 不存在或未設定，系統將自動使用預設的 URL 和 Key。
// 請記得在 Supabase 後台設定 "Allowed Referrers" (網域白名單) 以保護您的 Key。

let supabaseUrl = 'https://pyltlobngdnoqjnrxefn.supabase.co';
let supabaseKey = 'sb_publishable_nF7wxdNjzwhscd6mPENmtw_k2oQvQ-l';

try {
  // @ts-ignore
  if (import.meta && import.meta.env) {
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_URL) {
      // @ts-ignore
      supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    // @ts-ignore
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      // @ts-ignore
      supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  }
} catch (e) {
  // 忽略錯誤，使用預設值
  console.warn('Supabase env vars not found, using defaults.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 定義資料夾類型
export type UploadFolder = 'people' | 'race';

export const uploadImage = async (
  file: File, 
  folder: UploadFolder, 
  customName?: string,
  bucket: string = 'runbike'
): Promise<{ url: string | null, error: string | null }> => {
  try {
    // 1. 使用 browser-image-compression 進行圖片壓縮
    const options = {
      maxSizeMB: 1,           // 最大 1MB
      maxWidthOrHeight: 1920, // 最大寬或高 1920px
      useWebWorker: true
    };
    
    let compressedFile = file;
    try {
        compressedFile = await imageCompression(file, options);
    } catch (compressionError) {
        console.warn('Image compression failed, using original file:', compressionError);
    }

    // 2. 處理檔案路徑與名稱
    const fileExt = file.name.split('.').pop();
    // 如果有指定 customName (例如 4_s)，就使用它，否則使用隨機名稱
    const fileName = customName 
      ? `${customName}.${fileExt}` 
      : `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    
    // 組合完整路徑: people/4_s.jpg 或 race/xxxx.jpg
    // 注意：Supabase Storage 的路徑不應包含開頭的 /
    const filePath = `${folder}/${fileName}`;

    // 3. 上傳檔案 (upsert: true 允許覆蓋同名檔案，這對修改頭像很重要)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: true // 允許覆蓋
      });

    if (error) {
      throw error;
    }

    // 4. 取得公開連結
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // 回傳 URL
    return { url: publicUrl, error: null };
  } catch (error: any) {
    console.error('Supabase Upload Error:', error);
    
    // 增加更友善的錯誤提示
    if (error.message && error.message.includes('row-level security policy')) {
        console.warn('權限錯誤提示：請前往 Supabase 後台 > Storage > Policies，確認 "runbike" bucket 是否已新增允許 "anon" 角色進行 "INSERT" 的 Policy。');
    }

    return { url: null, error: error.message || 'Upload failed' };
  }
};
