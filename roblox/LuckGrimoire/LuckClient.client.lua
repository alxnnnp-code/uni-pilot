-- LocalScript: StarterPlayer/StarterPlayerScripts/LuckClient
-- Teclas: Z = Thunder Step, X = Lightning Orbs, C = Thunder Pursuit, V = Thunder Fiend (ultimate)
-- Tambien aplica los VFX de camara (temblor + destello amarillo)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")

local folder = ReplicatedStorage:WaitForChild("LuckGrimoire")
local LuckSkills = require(folder:WaitForChild("LuckSkills"))
local remote = folder:WaitForChild("CastLuckSkill")
local vfxRemote = folder:WaitForChild("LuckVFXEvent")

local keyToSkill = {}
for name, cfg in LuckSkills.Config do
	keyToSkill[cfg.Key] = name
end

local readyAt = {}

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then return end
	local skill = keyToSkill[input.KeyCode]
	if not skill then return end
	if (readyAt[skill] or 0) > os.clock() then return end
	remote:FireServer(skill)
end)

remote.OnClientEvent:Connect(function(skill, cooldown)
	readyAt[skill] = os.clock() + cooldown
end)

-- ===== VFX de camara =====
local shake = { intensity = 0, expires = 0 }
local flash = Instance.new("ColorCorrectionEffect")
flash.Name = "LuckFlash"
flash.Brightness = 0
flash.TintColor = Color3.fromRGB(255, 240, 170)
flash.Parent = Lighting

RunService:BindToRenderStep("LuckCameraShake", Enum.RenderPriority.Camera.Value + 1, function(dt)
	local cam = workspace.CurrentCamera
	if not cam then return end
	if os.clock() > shake.expires then
		shake.intensity = 0
		return
	end
	local a = shake.intensity * 0.6
	cam.CFrame *= CFrame.Angles(
		math.rad((math.random() - 0.5) * a),
		math.rad((math.random() - 0.5) * a),
		math.rad((math.random() - 0.5) * a))
end)

local function doShake(position, intensity, radius)
	local cam = workspace.CurrentCamera
	local dist = cam and (cam.CFrame.Position - position).Magnitude or 0
	local falloff = math.clamp(1 - dist / radius, 0, 1)
	if falloff <= 0 then return end
	shake.intensity = math.max(shake.intensity, intensity * falloff)
	shake.expires = os.clock() + 0.28
	TweenService:Create(flash, TweenInfo.new(0.12), { Brightness = 0.35 * falloff }):Play()
	task.delay(0.12, function()
		TweenService:Create(flash, TweenInfo.new(0.35), { Brightness = 0 }):Play()
	end)
end

vfxRemote.OnClientEvent:Connect(function(action, position, intensity, radius)
	if action == "Shake" and typeof(position) == "Vector3" then
		doShake(position, intensity, radius or 80)
	end
end)
