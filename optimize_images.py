import os
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

MEDIA_DIR = r"Media"
TARGET_DIR = r"assets\images"

os.makedirs(TARGET_DIR, exist_ok=True)

NAME_MAPPING = {
    "votosde amorRm.jpg": "votos_de_amor.jpg",
    "corazonesmalheridosRm.jpg": "corazones_malheridos.jpg",
    "categoriaCienciaFicion.jpg": "categoria_ciencia_ficcion.jpg",
    "divergentePosterCF.jpg": "divergente.jpg",
    "duneCf.jpg": "dune.jpg",
    "fondoRomance.jpg": "fondo_romance.jpg",
    "imagencine.jpg": "cinema_hero_banner.jpg",
    "juegosdelhambre.jpg": "juegos_del_hambre.jpg",
    "ladoncellaSUS.jpg": "la_doncella.jpg",
    "mujerBonitaRm.jpg": "mujer_bonita.jpg",
    "otraimagenpacine.jpg": "cinema_hall.jpg",
    "quepasolunesSus.jpg": "que_paso_con_lunes.jpg",
    "telefonoSus.jpg": "el_telefono.jpg",
    "what-is-an-operating-system.jpg": "cinema_tech.jpg",
}

total_original = 0
total_optimized = 0

print("Optimizando imágenes de CinemaStellar...")
print("-" * 75)

for fname in os.listdir(MEDIA_DIR):
    fpath = os.path.join(MEDIA_DIR, fname)
    if not os.path.isfile(fpath):
        continue
    
    orig_size = os.path.getsize(fpath)
    total_original += orig_size
    
    out_name = NAME_MAPPING.get(fname, fname.lower().replace(" ", "_"))
    out_path = os.path.join(TARGET_DIR, out_name)
    
    try:
        with Image.open(fpath) as img:
            # Convert RGBA to RGB if needed
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Determine maximum dimension
            max_dim = 1920 if ("hero" in out_name or "banner" in out_name or "fondo" in out_name or "hall" in out_name) else 1000
            
            w, h = img.size
            if max(w, h) > max_dim:
                ratio = max_dim / max(w, h)
                new_w, new_h = int(w * ratio), int(h * ratio)
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            img.save(out_path, "JPEG", quality=82, optimize=True, progressive=True)
            
        opt_size = os.path.getsize(out_path)
        total_optimized += opt_size
        pct = (1 - (opt_size / orig_size)) * 100
        print(f"✓ {fname:<30} -> {out_name:<25} | {orig_size / 1024:>7.1f} KB -> {opt_size / 1024:>6.1f} KB (-{pct:4.1f}%)")
    except Exception as e:
        print(f"✗ Error optimizando {fname}: {e}")

print("-" * 75)
print(f"Tamaño Original Total:  {total_original / (1024 * 1024):.2f} MB")
print(f"Tamaño Optimizado Total: {total_optimized / (1024 * 1024):.2f} MB")
print(f"Reducción Neta:         {(1 - (total_optimized / total_original)) * 100:.1f}% de espacio ahorrado")
