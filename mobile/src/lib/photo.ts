import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Pick or take a photo, then resize on the device before upload:
// a ~1080 px JPEG for viewing and a ~320 px thumbnail for the grid.
// Phone camera photos are 3–12 MB; these come out around 150–300 KB.

const toJpeg = async (uri: string, width: number, height: number, maxSide: number, compress: number) => {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const context = ImageManipulator.manipulate(uri);
  if (scale < 1) context.resize(width >= height ? { width: Math.round(width * scale) } : { height: Math.round(height * scale) });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
};

export async function pickProgressPhoto(source: 'camera' | 'library'): Promise<{ image: string; thumb: string } | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Camera permission is needed to take a photo.' : 'Photo library permission is needed.');

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false, cameraType: ImagePicker.CameraType.front };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const { uri, width, height } = result.assets[0];
  const [image, thumb] = await Promise.all([
    toJpeg(uri, width, height, 1080, 0.8),
    toJpeg(uri, width, height, 320, 0.7),
  ]);
  return { image, thumb };
}
