-- Script: ServerScriptService/LuckServer
-- Valida cooldowns en el servidor y ejecuta las skills.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local folder = ReplicatedStorage:WaitForChild("LuckGrimoire")
local LuckSkills = require(folder:WaitForChild("LuckSkills"))

local remote = folder:FindFirstChild("CastLuckSkill") or Instance.new("RemoteEvent")
remote.Name = "CastLuckSkill"
remote.Parent = folder

local cooldowns: { [Player]: { [string]: number } } = {}

remote.OnServerEvent:Connect(function(player, skillName)
	if typeof(skillName) ~= "string" then return end
	local cfg = LuckSkills.Config[skillName]
	if not cfg or type(LuckSkills[skillName]) ~= "function" then return end

	local character = player.Character
	local hum = character and character:FindFirstChildOfClass("Humanoid")
	if not hum or hum.Health <= 0 or not character:FindFirstChild("HumanoidRootPart") then return end

	cooldowns[player] = cooldowns[player] or {}
	local now = os.clock()
	if (cooldowns[player][skillName] or 0) > now then return end

	local ok, result = pcall(LuckSkills[skillName], character)
	if not ok then warn("[LuckGrimoire]", skillName, result) return end
	if result == false then return end -- skill fallida (sin objetivo): no consume cooldown
	cooldowns[player][skillName] = now + cfg.Cooldown
	remote:FireClient(player, skillName, cfg.Cooldown)
end)

Players.PlayerRemoving:Connect(function(p) cooldowns[p] = nil end)
