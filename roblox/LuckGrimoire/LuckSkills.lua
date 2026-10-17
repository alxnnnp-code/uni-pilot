-- ModuleScript: ReplicatedStorage/LuckGrimoire/LuckSkills
-- Grimorio de Luck Voltia (Magia de Rayo) - 4 skills
local Debris = game:GetService("Debris")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local VFX = require(script.Parent:WaitForChild("LuckVFX"))

local LuckSkills = {}

local CRIT_CHANCE = 0.25 -- "Suerte": 25% de golpe critico
local CRIT_MULT = 1.75

LuckSkills.Config = {
	ThunderStep    = { Key = Enum.KeyCode.Z, Cooldown = 4,  Damage = 18, Range = 35 },
	LightningOrbs  = { Key = Enum.KeyCode.X, Cooldown = 7,  Damage = 10, Count = 5, Speed = 120 },
	ThunderPursuit = { Key = Enum.KeyCode.C, Cooldown = 10, Damage = 30, Range = 60 },
	ThunderFiend   = { Key = Enum.KeyCode.V, Cooldown = 25, Damage = 55, Radius = 25 },
}

-- ===== Utilidades =====
local function rollDamage(base)
	if math.random() < CRIT_CHANCE then
		return math.floor(base * CRIT_MULT), true
	end
	return base, false
end

local function getEnemyHumanoid(part, caster)
	local model = part:FindFirstAncestorOfClass("Model")
	if not model or model == caster then return nil end
	local hum = model:FindFirstChildOfClass("Humanoid")
	if hum and hum.Health > 0 then return hum end
	return nil
end

-- Daño + numero flotante (critico = "¡SUERTE!")
local function damage(hum, base)
	local amount, crit = rollDamage(base)
	hum:TakeDamage(amount)
	local root = hum.Parent and hum.Parent:FindFirstChild("HumanoidRootPart")
	if root then
		local gui = Instance.new("BillboardGui")
		gui.Size = UDim2.fromOffset(110, 44)
		gui.StudsOffset = Vector3.new(0, 3, 0)
		gui.AlwaysOnTop = true
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.GothamBlack
		label.TextScaled = true
		label.TextStrokeTransparency = 0.4
		label.TextColor3 = crit and Color3.fromRGB(255, 80, 80) or VFX.CORE
		label.Text = crit and ("¡SUERTE! " .. amount) or tostring(amount)
		label.Parent = gui
		gui.Parent = root
		gui:TweenSize(UDim2.fromOffset(130, 52), Enum.EasingDirection.Out, Enum.EasingStyle.Back, 0.15)
		Debris:AddItem(gui, crit and 1.4 or 1)
		VFX.Emitter(root, { Emit = crit and 25 or 8, Speed = NumberRange.new(10, 30) })
	end
end

local function enemiesInRadius(center, radius, caster)
	local params = OverlapParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { caster }
	local found, seen = {}, {}
	for _, part in workspace:GetPartBoundsInRadius(center, radius, params) do
		local hum = getEnemyHumanoid(part, caster)
		if hum and not seen[hum] then
			seen[hum] = true
			table.insert(found, hum)
		end
	end
	return found
end

-- ===== SKILL 1: Thunder Step (Z) — dash relampago =====
function LuckSkills.ThunderStep(character)
	local cfg = LuckSkills.Config.ThunderStep
	local root = character.HumanoidRootPart
	local start = root.Position
	local dir = root.CFrame.LookVector

	-- carga en el punto de salida
	VFX.Shockwave(start, 8, 0.35)
	VFX.Emitter(root, { Emit = 25, Speed = NumberRange.new(15, 40), Spread = Vector2.new(60, 60) })
	VFX.Light(root, 12, 5, 0.3)
	VFX.Afterimage(character, 0.4)

	local params = RaycastParams.new()
	params.FilterDescendantsInstances = { character }
	local hit = workspace:Raycast(start, dir * cfg.Range, params)
	local finish = hit and (hit.Position - dir * 3) or (start + dir * cfg.Range)

	local half = (finish - start).Magnitude / 2
	for _, hum in enemiesInRadius(start:Lerp(finish, 0.5), half + 4, character) do
		damage(hum, cfg.Damage)
		local p = hum.Parent:FindFirstChild("HumanoidRootPart")
		if p then VFX.Impact(p.Position, 0.8) end
	end

	VFX.Bolt(start, finish, { Width = 0.5, Life = 0.35, Jitter = 2 })
	root.CFrame = CFrame.lookAt(finish, finish + dir)
	VFX.Afterimage(character, 0.35)

	-- remolino de llegada + temblor de camara
	local anchor = Instance.new("Part")
	anchor.Anchored, anchor.CanCollide, anchor.CanQuery, anchor.Transparency = true, false, false, 1
	anchor.Size, anchor.Position, anchor.Parent = Vector3.one * 0.2, finish, workspace
	VFX.Emitter(anchor, { Rate = 70, Speed = NumberRange.new(2, 8), Lifetime = NumberRange.new(0.3, 0.6) })
	Debris:AddItem(anchor, 0.7)
	VFX.Shake(finish, 0.9)
	VFX.Impact(finish, 0.9)
end

-- ===== SKILL 2: Lightning Orbs (X) — rafaga de orbes =====
function LuckSkills.LightningOrbs(character)
	local cfg = LuckSkills.Config.LightningOrbs
	local root = character.HumanoidRootPart
	VFX.Aura(character, 0.55) -- chispas al cargar
	for i = 1, cfg.Count do
		task.delay((i - 1) * 0.12, function()
			if not root.Parent then return end
			local cf = root.CFrame * CFrame.Angles(0, math.rad(math.random(-8, 8)), 0)

			local orb = Instance.new("Part")
			orb.Shape, orb.Material, orb.Color = Enum.PartType.Ball, Enum.Material.Neon, VFX.CORE
			orb.Size, orb.CanCollide, orb.Massless, orb.Transparency = Vector3.one * 2.2, false, true, 0.1
			orb.CFrame = cf + cf.LookVector * 3
			VFX.AttachTrail(orb, 2.4)
			VFX.TrailSparks(orb, 60)
			VFX.Emitter(orb, { Emit = 20, Speed = NumberRange.new(4, 12), Lifetime = NumberRange.new(0.2, 0.45),
				Size = NumberSequence.new({ NumberSequenceKeypoint.new(0, 1.4), NumberSequenceKeypoint.new(1, 0) }) })
			VFX.Light(orb, 16, 5)
			orb.Parent = workspace

			local att = Instance.new("Attachment")
			att.Parent = orb
			local lv = Instance.new("LinearVelocity")
			lv.Attachment0, lv.MaxForce = att, math.huge
			lv.VectorVelocity = cf.LookVector * cfg.Speed
			lv.Parent = orb

			local done = false
			orb.Touched:Connect(function(part)
				if done or part:IsDescendantOf(character) then return end
				done = true
				local hum = getEnemyHumanoid(part, character)
				if hum then
					damage(hum, cfg.Damage)
					local p = hum.Parent:FindFirstChild("HumanoidRootPart")
					VFX.Shake(p and p.Position or orb.Position, 0.35)
				end
				VFX.Impact(orb.Position, 1.1)
				orb:Destroy()
			end)
			Debris:AddItem(orb, 2)
		end)
	end
end

-- ===== SKILL 3: Thunder Pursuit (C) — teletransporte detras del enemigo mas cercano =====
function LuckSkills.ThunderPursuit(character)
	local cfg = LuckSkills.Config.ThunderPursuit
	local root = character.HumanoidRootPart
	local closest, eRoot, bestDist = nil, nil, cfg.Range
	for _, hum in enemiesInRadius(root.Position, cfg.Range, character) do
		local r = hum.Parent:FindFirstChild("HumanoidRootPart")
		if r then
			local d = (r.Position - root.Position).Magnitude
			if d < bestDist then closest, eRoot, bestDist = hum, r, d end
		end
	end
	if not closest then return false end -- sin objetivo: no gasta cooldown

	-- desvanecimiento en el origen
	VFX.Shockwave(root.Position, 10, 0.4)
	VFX.Afterimage(character, 0.5)
	VFX.Emitter(root, { Emit = 30, Speed = NumberRange.new(10, 30) })

	local behind = eRoot.CFrame * CFrame.new(0, 0, 4)
	VFX.Bolt(root.Position, behind.Position, { Width = 0.45, Life = 0.3, Jitter = 1.8 })
	root.CFrame = CFrame.lookAt(behind.Position, eRoot.Position)
	VFX.Afterimage(character, 0.4)

	-- impacto: rayo vertical, anillo, chispas y luces
	VFX.Bolt(eRoot.Position + Vector3.new(0, 45, 0), eRoot.Position, { Width = 0.9, Life = 0.4, Jitter = 2.4 })
	VFX.Impact(eRoot.Position, 1.4)
	VFX.Shake(eRoot.Position, 1.6)
	damage(closest, cfg.Damage)
	VFX.Emitter(eRoot, { Emit = 40, Speed = NumberRange.new(25, 60), Spread = Vector2.new(80, 80) })
	eRoot.AssemblyLinearVelocity += eRoot.CFrame.LookVector * 40 + Vector3.new(0, 25, 0)
	return true
end

-- ===== SKILL 4 (ULTIMATE): Thunder Fiend Rampage (V) =====
function LuckSkills.ThunderFiend(character)
	local cfg = LuckSkills.Config.ThunderFiend
	local center = character.HumanoidRootPart.Position
	local hum = character:FindFirstChildOfClass("Humanoid")

	-- activacion: aura + temblor fuerte + anillo gigante + rayo del cielo
	VFX.Shake(center, 2.5, 150)
	VFX.Aura(character, 6)
	VFX.Shockwave(center, cfg.Radius * 1.6, 0.7)
	VFX.Bolt(center + Vector3.new(0, 60, 0), center, { Width = 1.4, Life = 0.5, Jitter = 3 })

	if hum then -- modo Thunder Fiend: +velocidad 6s
		hum.WalkSpeed += 16
		task.delay(6, function() if hum.Parent then hum.WalkSpeed -= 16 end end)
	end

	for wave = 1, 3 do
		task.delay((wave - 1) * 0.45, function()
			VFX.Shockwave(center, cfg.Radius * (1 + wave * 0.5), 0.55)
			-- descargas verticales aleatorias dentro del area
			for _ = 1, 10 do
				local o = Vector3.new(math.random(-cfg.Radius, cfg.Radius), 0, math.random(-cfg.Radius, cfg.Radius))
				local ground = center + o
				VFX.Bolt(ground + Vector3.new(0, 45, 0), ground, { Width = 0.45, Life = 0.3, Jitter = 2 })
				VFX.Impact(ground, 0.7)
			end
			for _, enemy in enemiesInRadius(center, cfg.Radius, character) do
				damage(enemy, math.floor(cfg.Damage / 3))
				VFX.Emitter(enemy.Parent, { Emit = 20, Speed = NumberRange.new(15, 35) })
			end
		end)
	end
end

return LuckSkills
