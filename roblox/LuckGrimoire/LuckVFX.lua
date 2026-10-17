-- ModuleScript: ReplicatedStorage/LuckGrimoire/LuckVFX
-- VFX de alta calidad para el grimorio de Luck (rayo amarillo/blanco)
local TweenService = game:GetService("TweenService")
local Debris = game:GetService("Debris")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local VFX = {}

VFX.CORE = Color3.fromRGB(255, 255, 235)
VFX.GLOW = Color3.fromRGB(255, 220, 60)
VFX.DEEP = Color3.fromRGB(255, 160, 20)
VFX.ScreenShake = true -- ponlo en false si prefieres jugar sin temblor de camara

local TEX_SPARK = "rbxasset://textures/particles/sparkles_main.dds"
local TEX_SMOKE = "rbxasset://textures/particles/smoke_main.dds"
local TEX_FIRE = "rbxasset://textures/particles/fire_main.dds"
VFX.TEX_FIRE = TEX_FIRE

local function tween(obj, t, props, style)
	local tw = TweenService:Create(obj, TweenInfo.new(t, style or Enum.EasingStyle.Quad, Enum.EasingDirection.Out), props)
	tw:Play()
	return tw
end

local function fxPart(props)
	local p = Instance.new("Part")
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch, p.CastShadow = true, false, false, false, false
	p.Material = Enum.Material.Neon
	p.Color = VFX.GLOW
	for k, v in props do p[k] = v end
	p.Parent = workspace
	return p
end

local function colorSeq() return ColorSequence.new({
	ColorSequenceKeypoint.new(0, VFX.CORE),
	ColorSequenceKeypoint.new(0.4, VFX.GLOW),
	ColorSequenceKeypoint.new(1, VFX.DEEP),
}) end

-- Emisor configurable; si emitCount se pasa, hace una rafaga y se destruye
function VFX.Emitter(parent, opts)
	local e = Instance.new("ParticleEmitter")
	e.Texture = opts.Texture or TEX_SPARK
	e.Color = colorSeq()
	e.LightEmission = 1
	e.LightInfluence = 0
	e.Brightness = opts.Brightness or 4
	e.Size = opts.Size or NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.2), NumberSequenceKeypoint.new(1, 0) })
	e.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0), NumberSequenceKeypoint.new(1, 1) })
	e.Lifetime = opts.Lifetime or NumberRange.new(0.2, 0.5)
	e.Speed = opts.Speed or NumberRange.new(20, 45)
	e.SpreadAngle = opts.Spread or Vector2.new(180, 180)
	e.Rotation = NumberRange.new(0, 360)
	e.RotSpeed = NumberRange.new(-300, 300)
	e.Drag = opts.Drag or 6
	e.Acceleration = opts.Acceleration or Vector3.zero
	e.Rate = opts.Rate or 0
	e.ZOffset = 1
	e.Parent = parent
	if opts.Emit then e:Emit(opts.Emit) end
	return e
end

function VFX.Light(parent, range, brightness, life)
	local l = Instance.new("PointLight")
	l.Color = VFX.GLOW
	l.Range = range
	l.Brightness = brightness
	l.Shadows = true
	l.Parent = parent
	if life then tween(l, life, { Brightness = 0 }) end
	return l
end

-- Pide a los clientes cercanos temblor de camara + destello
function VFX.Shake(position, intensity, radius)
	if not VFX.ScreenShake then return end
	local folder = ReplicatedStorage:FindFirstChild("LuckGrimoire")
	local remote = folder and folder:FindFirstChild("LuckVFXEvent")
	if remote then remote:FireAllClients("Shake", position, intensity, radius or 80) end
end

-- Rayo con nucleo blanco + halo amarillo + ramas, parpadea y se desvanece
local function segment(a, b, width, color, trans, life)
	local dist = (b - a).Magnitude
	if dist < 0.05 then return end
	local p = fxPart({
		Size = Vector3.new(width, width, dist),
		CFrame = CFrame.lookAt(a, b) * CFrame.new(0, 0, -dist / 2),
		Color = color, Transparency = trans,
	})
	tween(p, life, { Transparency = 1, Size = Vector3.new(0, 0, dist) }, Enum.EasingStyle.Exponential)
	Debris:AddItem(p, life)
end

function VFX.Bolt(from, to, opts)
	opts = opts or {}
	local width = opts.Width or 0.35
	local life = opts.Life or 0.3
	local jitter = opts.Jitter or 1.6
	local segs = math.clamp(math.floor((to - from).Magnitude / 3), 4, 24)
	local points = { from }
	for i = 1, segs - 1 do
		local base = from:Lerp(to, i / segs)
		local falloff = math.sin(math.pi * i / segs) -- mas caotico en el centro
		table.insert(points, base + Vector3.new(
			(math.random() - 0.5) * 2 * jitter * falloff,
			(math.random() - 0.5) * 2 * jitter * falloff,
			(math.random() - 0.5) * 2 * jitter * falloff))
	end
	table.insert(points, to)
	for i = 1, #points - 1 do
		segment(points[i], points[i + 1], width, VFX.CORE, 0, life)                 -- nucleo
		segment(points[i], points[i + 1], width * 3.2, VFX.GLOW, 0.65, life * 1.2)  -- halo
		if opts.Branches ~= false and math.random() < 0.3 then
			local dir = (points[i + 1] - points[i]).Unit
			local rnd = Vector3.new(math.random() - 0.5, math.random() - 0.5, math.random() - 0.5) * 1.6
			local branchEnd = points[i] + (dir + rnd).Unit * math.random(3, 7)
			VFX.Bolt(points[i], branchEnd, { Width = width * 0.45, Life = life * 0.7, Jitter = jitter * 0.6, Branches = false })
		end
	end
	if opts.Flicker ~= false then -- segundo destello con otra forma
		task.delay(life * 0.35, function()
			VFX.Bolt(from, to, { Width = width * 0.7, Life = life * 0.6, Jitter = jitter, Branches = false, Flicker = false })
		end)
	end
end

-- Esfera de impacto + anillo expansivo + chispas + humo + luz + arcos radiales
function VFX.Impact(position, scale)
	scale = scale or 1
	local core = fxPart({ Shape = Enum.PartType.Ball, Size = Vector3.one * 2 * scale, Position = position, Color = VFX.CORE })
	tween(core, 0.35, { Size = Vector3.one * 7 * scale, Transparency = 1 }, Enum.EasingStyle.Exponential)
	local glow = fxPart({ Shape = Enum.PartType.Ball, Size = Vector3.one * 3 * scale, Position = position,
		Transparency = 0.5, Material = Enum.Material.ForceField, Color = VFX.GLOW })
	tween(glow, 0.5, { Size = Vector3.one * 11 * scale, Transparency = 1 })
	VFX.Shockwave(position, 14 * scale, 0.45)

	local anchor = fxPart({ Size = Vector3.one * 0.1, Position = position, Transparency = 1 })
	VFX.Emitter(anchor, { Emit = math.floor(35 * scale), Speed = NumberRange.new(30 * scale, 70 * scale) })
	VFX.Emitter(anchor, { Emit = 8, Texture = TEX_SMOKE, Speed = NumberRange.new(4, 10),
		Lifetime = NumberRange.new(0.5, 0.9), Brightness = 1.5,
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 2 * scale), NumberSequenceKeypoint.new(1, 6 * scale) }) })
	VFX.Light(anchor, 18 * scale, 8, 0.5)
	for _ = 1, 3 do
		local dir = Vector3.new(math.random() - 0.5, math.random() * 0.6, math.random() - 0.5).Unit
		VFX.Bolt(position, position + dir * math.random(4, 9) * scale, { Width = 0.2, Life = 0.2, Flicker = false })
	end
	Debris:AddItem(core, 0.5); Debris:AddItem(glow, 0.6); Debris:AddItem(anchor, 1.2)
end

function VFX.Shockwave(position, size, life)
	local ring = fxPart({ Shape = Enum.PartType.Cylinder, Size = Vector3.new(0.4, 1, 1),
		CFrame = CFrame.new(position) * CFrame.Angles(0, 0, math.rad(90)), Transparency = 0.2 })
	tween(ring, life, { Size = Vector3.new(0.05, size, size), Transparency = 1 }, Enum.EasingStyle.Exponential)
	Debris:AddItem(ring, life)
end

-- Silueta fantasma del personaje (afterimage del dash)
function VFX.Afterimage(character, life)
	life = life or 0.35
	for _, d in character:GetChildren() do
		if d:IsA("BasePart") and d.Name ~= "HumanoidRootPart" and d.Transparency < 1 then
			local g = fxPart({ Size = d.Size, CFrame = d.CFrame, Color = VFX.GLOW, Transparency = 0.35 })
			tween(g, life, { Transparency = 1, Size = d.Size * 1.15 })
			Debris:AddItem(g, life)
		end
	end
end

-- Aura electrica: Highlight + particulas + luz + arcos que recorren el cuerpo
function VFX.Aura(character, duration)
	local root = character:FindFirstChild("HumanoidRootPart")
	if not root then return end
	local hl = Instance.new("Highlight")
	hl.FillColor, hl.OutlineColor = VFX.GLOW, VFX.CORE
	hl.FillTransparency, hl.OutlineTransparency = 0.75, 0
	hl.Parent = character
	local sparks = VFX.Emitter(root, { Rate = 60, Speed = NumberRange.new(3, 8),
		Lifetime = NumberRange.new(0.2, 0.4),
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.6), NumberSequenceKeypoint.new(1, 0) }) })
	local light = VFX.Light(root, 14, 3)

	task.spawn(function()
		local t0 = os.clock()
		while root.Parent and os.clock() - t0 < duration do
			local a = root.Position + Vector3.new(math.random(-2, 2), math.random(-3, 2), math.random(-2, 2))
			local b = root.Position + Vector3.new(math.random(-3, 3), math.random(-3, 3), math.random(-3, 3))
			VFX.Bolt(a, b, { Width = 0.12, Life = 0.12, Jitter = 0.8, Branches = false, Flicker = false })
			task.wait(0.07)
		end
	end)
	task.delay(duration, function()
		sparks.Enabled = false
		tween(hl, 0.4, { FillTransparency = 1, OutlineTransparency = 1 })
		tween(light, 0.4, { Brightness = 0 })
		Debris:AddItem(hl, 0.5); Debris:AddItem(light, 0.5); Debris:AddItem(sparks, 0.6)
	end)
end

-- Trail para proyectiles (nucleo + estela ancha)
function VFX.AttachTrail(part, width)
	width = width or 1
	local a0, a1 = Instance.new("Attachment"), Instance.new("Attachment")
	a0.Position, a1.Position = Vector3.new(0, width / 2, 0), Vector3.new(0, -width / 2, 0)
	a0.Parent, a1.Parent = part, part
	local t = Instance.new("Trail")
	t.Attachment0, t.Attachment1 = a0, a1
	t.Color = colorSeq()
	t.LightEmission = 1
	t.Lifetime = 0.25
	t.FaceCamera = true
	t.Transparency = NumberSequence.new({ NumberSequenceKeypoint.new(0, 0.1), NumberSequenceKeypoint.new(1, 1) })
	t.WidthScale = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1), NumberSequenceKeypoint.new(1, 0) })
	t.Parent = part
	return t
end

-- Estela de chispas + rayitos para proyectiles
function VFX.TrailSparks(part, rate)
	local e = VFX.Emitter(part, { Rate = rate or 40, Texture = TEX_FIRE,
		Speed = NumberRange.new(1, 4), Lifetime = NumberRange.new(0.15, 0.35),
		Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.1), NumberSequenceKeypoint.new(1, 0) }) })
	local l = VFX.Light(part, 12, 3)
	return e, l
end

return VFX
