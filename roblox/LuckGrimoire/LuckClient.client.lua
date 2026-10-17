-- LocalScript: StarterPlayer/StarterPlayerScripts/LuckClient
-- Teclas: Z = Thunder Step, X = Lightning Orbs, C = Thunder Pursuit, V = Thunder Fiend (ultimate)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local folder = ReplicatedStorage:WaitForChild("LuckGrimoire")
local LuckSkills = require(folder:WaitForChild("LuckSkills"))
local remote = folder:WaitForChild("CastLuckSkill")

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
