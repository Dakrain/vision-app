const { ThumbImageBuffer } = window.require('agora-electron-sdk');

// export default (input: any) => {
//   const keyStr =
//     'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
//   let output = '';
//   let chr1;
//   let chr2;
//   let chr3;
//   let enc1;
//   let enc2;
//   let enc3;
//   let enc4;
//   let i = 0;

//   while (i < input.length) {
//     chr1 = input[i++];
//     chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index
//     chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

//     enc1 = chr1 >> 2;
//     enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
//     enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
//     enc4 = chr3 & 63;

//     if (Number.isNaN(chr2)) {
//       enc3 = enc4 = 64;
//     } else if (Number.isNaN(chr3)) {
//       enc4 = 64;
//     }
//     output +=
//       keyStr.charAt(enc1) +
//       keyStr.charAt(enc2) +
//       keyStr.charAt(enc3) +
//       keyStr.charAt(enc4);
//   }
//   return output;
// };

export const thumbImageBufferToBase64 = (target?: typeof ThumbImageBuffer) => {
  if (!target) {
    return '';
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const width = target.width!;
  const height = target.height!;
  canvas.width = width;
  canvas.height = height;

  const rowBytes = width * 4;
  for (let row = 0; row < height; row += 1) {
    const srow = row;
    const imageData = ctx.createImageData(width, 1);
    const start = srow * width * 4;
    if (process.platform === 'win32') {
      for (let i = 0; i < rowBytes; i += 4) {
        imageData.data[i] = target.buffer![start + i + 2]!;
        imageData.data[i + 1] = target.buffer![start + i + 1]!;
        imageData.data[i + 2] = target.buffer![start + i]!;
        imageData.data[i + 3] = target.buffer![start + i + 3]!;
      }
    } else {
      for (let i = 0; i < rowBytes; i += 1) {
        imageData.data[i] = target.buffer![start + i]!;
      }
    }
    ctx.putImageData(imageData, 0, row);
  }

  return canvas.toDataURL('image/png');
};
