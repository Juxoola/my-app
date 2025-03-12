import sys
import json
import os
from tifffile import TiffWriter
import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_bounds

def ensure_ascii(text):
    if text is None:
        return ""
    return text.encode('ascii', 'replace').decode('ascii')

def merge_tiff_files(data):
    try:
        layers = data.get('layers', [])
        polygon_coords = data.get('polygon_coords', [])

        if not layers:
            return {"status": "error", "message": "Не предоставлены слои для объединения"}

        current_dir = os.path.dirname(os.path.realpath(__file__))
        input_dir = os.path.join(current_dir, "temp_inputs")
        output_dir = os.path.join(current_dir, "outputs")

        os.makedirs(input_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        polygon_json_path = os.path.join(output_dir, "polygon_coords.json")
        with open(polygon_json_path, 'w') as f:
            json.dump({
                "polygon_coords": polygon_coords
            }, f, indent=2)

        images = []

        # Вычисляем ограничивающий прямоугольник из координат полигона
        if polygon_coords and len(polygon_coords) >= 3:  #
            lons = [coord[0] for coord in polygon_coords]
            lats = [coord[1] for coord in polygon_coords]
            min_lon, max_lon = min(lons), max(lons)
            min_lat, max_lat = min(lats), max(lats)
            

            bbox = (min_lon, min_lat, max_lon, max_lat)
        else:
            bbox = None

        for layer in layers:
            filename = layer.get('filename')
            description = layer.get('description', 'Layer')

            file_path = os.path.join(input_dir, filename)

            if not os.path.exists(file_path):
                continue

            try:
                img = Image.open(file_path).convert('RGBA')
                img_array = np.array(img)
                images.append({
                    'array': img_array,
                    'description': description,
                    'path': file_path,
                    'width': img.width,
                    'height': img.height
                })
            except Exception:
                continue

        if not images:
            return {"status": "error", "message": "Не удалось загрузить ни одного корректного слоя изображения"}

        output_file = os.path.join(output_dir, "merged_layers.tif")
        
        # Создаем композитное изображение для предпросмотра
        if len(images) > 1:
            composite = Image.fromarray(images[0]['array'])
            for i in range(1, len(images)):
                layer_img = Image.fromarray(images[i]['array'])
                composite = Image.alpha_composite(composite, layer_img)
        else:
            composite = Image.fromarray(images[0]['array'])
        
        # Конвертируем каждый слой в GeoTIFF
        geotiff_layers = []
        for idx, img in enumerate(images):
            geotiff_path = os.path.join(output_dir, f"geo_{os.path.basename(img['path'])}")
            
            if bbox:
                transform = from_bounds(bbox[0], bbox[1], bbox[2], bbox[3], 
                                        img['width'], img['height'])
                
                with rasterio.open(
                    geotiff_path,
                    'w',
                    driver='GTiff',
                    height=img['height'],
                    width=img['width'],
                    count=4, 
                    dtype=img['array'].dtype,
                    crs='+proj=longlat +datum=WGS84 +no_defs', 
                    transform=transform,
                ) as dst:
                    for i in range(4):
                        dst.write(img['array'][:, :, i], i+1)
                
                geotiff_layers.append({
                    'filename': os.path.basename(geotiff_path),
                    'description': img['description']
                })
            else:
                Image.fromarray(img['array']).save(geotiff_path)
                geotiff_layers.append({
                    'filename': os.path.basename(geotiff_path),
                    'description': img['description']
                })

        # Сохраняем многослойный TIFF файл с добавленным сверху композитным слоем
        with TiffWriter(output_file, bigtiff=False) as tiff:
            tiff.write(
                np.array(composite),
                photometric='rgb',
                description=ensure_ascii("Композитный слой")
            )

            for img in reversed(images):
                tiff.write(
                    img['array'],
                    photometric='rgb',
                    description=ensure_ascii(img['description'])
                )

        composite_file = os.path.join(output_dir, "merged_composite.tif")
        Image.fromarray(np.array(composite)).save(composite_file)
        
        geo_composite_file = None
        if bbox:
            geo_composite_file = os.path.join(output_dir, "merged_composite_geo.tif")
            
            composite_transform = from_bounds(bbox[0], bbox[1], bbox[2], bbox[3],
                                             composite.width, composite.height)
            
            with rasterio.open(
                geo_composite_file,
                'w',
                driver='GTiff',
                height=composite.height,
                width=composite.width,
                count=4,  # RGBA
                dtype=np.array(composite).dtype,
                crs='+proj=longlat +datum=WGS84 +no_defs',
                transform=composite_transform,
            ) as dst:
                # Записываем каждый канал (R, G, B, A)
                composite_array = np.array(composite)
                for i in range(4):
                    dst.write(composite_array[:, :, i], i+1)

        

        return {
            "status": "success",
            "message": f"Успешно объединено {len(images)} слоев в GeoTIFF",
            "output_file": output_file,
            "composite_file": composite_file,
            "geo_composite_file": geo_composite_file if bbox else None,
            "polygon_json_file": polygon_json_path if polygon_coords else None,
            "geotiff_layers": geotiff_layers
        }

    except Exception as e:
        return {"status": "error", "message": f"Ошибка при создании файлов GeoTIFF: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Не предоставлены входные данные"}))
        sys.exit(1)

    try:
        input_data = json.loads(sys.argv[1])
        result = merge_tiff_files(input_data)
        print(json.dumps(result))
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "message": "Некорректный ввод JSON"}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Непредвиденная ошибка: {str(e)}"}))
