# Grimorio de Luck (Roblox / Luau)

4 skills de rayo para el grimorio de Luck Voltia, con VFX de alta calidad.

## Preview en el navegador

Abre `preview/index.html` (doble clic, o cualquier servidor estatico) y tendras una demo jugable
de las 4 skills con los mismos daños, rangos, cooldowns y VFX que el modulo de Roblox.

- **WASD / flechas** para moverte, **raton** para apuntar.
- **Z X C V** o los botones de abajo para lanzar las skills.
- Los enemigos persiguen y pegan; si mueres reapareces y el contador sigue.
- Abajo a la derecha se ven daño total, criticos y enemigos vivos.

Test headless del preview (sin navegador, canvas simulado):

```bash
node preview/smoke.js
```

## Instalación en Roblox Studio

| Archivo | Dónde va | Tipo |
|---|---|---|
| `LuckVFX.lua` | `ReplicatedStorage/LuckGrimoire` | ModuleScript **`LuckVFX`** |
| `LuckSkills.lua` | `ReplicatedStorage/LuckGrimoire` | ModuleScript **`LuckSkills`** |
| `LuckServer.server.lua` | `ServerScriptService` | Script |
| `LuckClient.client.lua` | `StarterPlayer/StarterPlayerScripts` | LocalScript |

El servidor crea la carpeta `LuckGrimoire` si ya existe, y los RemoteEvents `CastLuckSkill` y
`LuckVFXEvent`. Los nombres de los ModuleScripts deben ser exactamente `LuckVFX` y `LuckSkills`.

## Skills

| Tecla | Skill | Efecto | Cooldown |
|---|---|---|---|
| Z | Thunder Step | Dash con estela de rayos, golpea a los enemigos del recorrido | 4 s |
| X | Lightning Orbs | 5 orbes con estela, particulas y luz | 7 s |
| C | Thunder Pursuit | Teletransporte detras del enemigo mas cercano + rayo vertical | 10 s |
| V | Thunder Fiend Rampage | Aura, 3 oleadas de descargas en area, +16 de velocidad 6 s | 25 s |

Cada golpe tiene 25 % de probabilidad de critico (x1.75) y muestra "¡SUERTE!" sobre el enemigo.

## VFX incluidos (modulo `LuckVFX`)

- `Bolt(from, to)` — rayo procedural con nucleo blanco, halo amarillo, ramas y parpadeo.
- `Impact(position, scale)` — esfera, anillo expansivo, chispas, humo, luz y arcos radiales.
- `Shockwave(position, size, life)` — anillo que se expande.
- `Afterimage(character, life)` — siluetas fantasma del personaje.
- `Aura(character, duration)` — Highlight + particulas + luz + arcos recorriendo el cuerpo.
- `AttachTrail(part)` / `TrailSparks(part)` — estela y chispas para proyectiles.
- `Emitter(parent, opts)` / `Light(parent, ...)` — ayudantes de particulas y luces.
- `Shake(position, intensity, radius)` — temblor de camara + destello amarillo (cliente).

## Ajustes rapidos

- Daño, alcance, cooldown y teclas: tabla `LuckSkills.Config`.
- Critico: `CRIT_CHANCE` y `CRIT_MULT` en `LuckSkills.lua`.
- Colores del rayo: `VFX.CORE`, `VFX.GLOW`, `VFX.DEEP` en `LuckVFX.lua`.
- Desactivar el temblor de camara: `VFX.ScreenShake = false`.
- Texturas: por defecto usa texturas internas (`rbxasset://textures/...`), asi que no depende de
  assets del catalogo. Si quieres particulas propias, cambia `TEX_SPARK`, `TEX_SMOKE`, `TEX_FIRE`.
