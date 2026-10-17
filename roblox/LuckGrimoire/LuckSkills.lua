-- ModuleScript: ReplicatedStorage/LuckGrimoire/LuckSkills
-- Grimorio de Luck Voltia (Magia de Rayo) - 4 skills
local Debris = game:GetService("Debris")
local TweenService = game:GetService("TweenService")

local LuckSkills = {}

local LIGHTNING_COLOR = Color3.fromRGB(255, 240, 90)
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

local function damage(hum, base)
	local amount, crit = rollDamage(base)
	hum:TakeDamage(amount)
	local root = hum.Parent and hum.Parent:FindFirstChild("HumanoidRootPart")
	if root then
		local gui = Instance.new("BillboardGui")
		gui.Size = UDim2.fromOffset(100, 40)
		gui.StudsOffset = Vector3.new(0, 3, 0)
		gui.AlwaysOnTop = true
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundTransparency = 1
		label.Font = Enum.Font.GothamBlack
		label.TextScaled = true
		label.TextColor3 = crit and Color3.fromRGB(255, 80, 80) or LIGHTNING_COLOR
		label.Text = crit and ("¡SUERTE! " .. amount) or tostring(amount)
		label.Parent = gui
		gui.Parent = root
		Debris:AddItem(gui, 1)
	end
end

local function spark(position, size, life)
	life = life or 0.4
	local p = Instance.new("Part")
	p.Shape = Enum.PartType.Ball
	p.Material = Enum.Material.Neon
	p.Color = LIGHTNING_COLOR
	p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
	p.Size = Vector3.one * size
	p.Position = position
	p.Parent = workspace
	TweenService:Create(p, TweenInfo.new(life), { Size = Vector3.one * size * 2, Transparency = 1 }):Play()
	Debris:AddItem(p, life)
end

local function bolt(from, to)
	local segments = 6
	local last = from
	for i = 1, segments do
		local target = from:Lerp(to, i / segments)
		if i < segments then
			target += Vector3.new(math.random(-15, 15), math.random(-15, 15), math.random(-15, 15)) / 10
		end
		local dist = (target - last).Magnitude
		local p = Instance.new("Part")
		p.Material = Enum.Material.Neon
		p.Color = LIGHTNING_COLOR
		p.Anchored, p.CanCollide, p.CanQuery, p.CanTouch = true, false, false, false
		p.Size = Vector3.new(0.3, 0.3, dist)
		p.CFrame = CFrame.lookAt(last, target) * CFrame.new(0, 0, -dist / 2)
		p.Parent = workspace
		Debris:AddItem(p, 0.25)
		last = target
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

-- ===== SKILL 1: Thunder Step (Z) — dash relampago que golpea en linea =====
function LuckSkills.ThunderStep(character)
	local cfg = LuckSkills.Config.ThunderStep
	local root = character.HumanoidRootPart
	local start = root.Position
	local dir = root.CFrame.LookVector

	local params = RaycastParams.new()
	params.FilterDescendantsInstances = { character }
	local hit = workspace:Raycast(start, dir * cfg.Range, params)
	local finish = hit and (hit.Position - dir * 3) or (start + dir * cfg.Range)

	local half = (finish - start).Magnitude / 2
	for _, hum in enemiesInRadius(start:Lerp(finish, 0.5), half + 4, character) do
		damage(hum, cfg.Damage)
	end
	bolt(start, finish)
	root.CFrame = CFrame.lookAt(finish, finish + dir)
	spark(finish, 4)
end

-- ===== SKILL 2: Lightning Orbs (X) — rafaga de orbes electricos =====
function LuckSkills.LightningOrbs(character)
	local cfg = LuckSkills.Config.LightningOrbs
	local root = character.HumanoidRootPart
	for i = 1, cfg.Count do
		task.delay((i - 1) * 0.12, function()
			if not root.Parent then return end
			local cf = root.CFrame * CFrame.Angles(0, math.rad(math.random(-8, 8)), 0)
			local orb = Instance.new("Part")
			orb.Shape = Enum.PartType.Ball
			orb.Material = Enum.Material.Neon
			orb.Color = LIGHTNING_COLOR
			orb.Size = Vector3.one * 1.5
			orb.CanCollide = false
			orb.Massless = true
			orb.CFrame = cf + cf.LookVector * 3
			local att = Instance.new("Attachment")
			att.Parent = orb
			local lv = Instance.new("LinearVelocity")
			lv.Attachment0 = att
			lv.MaxForce = math.huge
			lv.VectorVelocity = cf.LookVector * cfg.Speed
			lv.Parent = orb
			orb.Parent = workspace
			orb:SetNetworkOwner(nil)

			local done = false
			orb.Touched:Connect(function(part)
				if done or part:IsDescendantOf(character) then return end
				local hum = getEnemyHumanoid(part, character)
				if hum then damage(hum, cfg.Damage) end
				done = true
				spark(orb.Position, 3)
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

	local behind = eRoot.CFrame * CFrame.new(0, 0, 4)
	bolt(root.Position, behind.Position)
	root.CFrame = CFrame.lookAt(behind.Position, eRoot.Position)
	spark(eRoot.Position, 5)
	damage(closest, cfg.Damage)
	eRoot.AssemblyLinearVelocity += eRoot.CFrame.LookVector * 40 + Vector3.new(0, 25, 0)
	return true
end

-- ===== SKILL 4 (ULTIMATE): Thunder Fiend Rampage (V) — tormenta de rayos en area =====
function LuckSkills.ThunderFiend(character)
	local cfg = LuckSkills.Config.ThunderFiend
	local center = character.HumanoidRootPart.Position
	local hum = character:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.WalkSpeed += 16 -- modo Thunder Fiend: +velocidad 6s
		task.delay(6, function() if hum.Parent then hum.WalkSpeed -= 16 end end)
	end
	spark(center, cfg.Radius, 0.8)
	for wave = 1, 3 do
		task.delay((wave - 1) * 0.4, function()
			for _ = 1, 8 do
				local o = Vector3.new(math.random(-cfg.Radius, cfg.Radius), 0, math.random(-cfg.Radius, cfg.Radius))
				bolt(center + o + Vector3.new(0, 40, 0), center + o)
			end
			for _, enemy in enemiesInRadius(center, cfg.Radius, character) do
				damage(enemy, math.floor(cfg.Damage / 3))
			end
		end)
	end
end

return LuckSkills
