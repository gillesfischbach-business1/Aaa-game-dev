using System.IO;
using UnrealBuildTool;

public class Luxembourg1998 : ModuleRules
{
	public Luxembourg1998(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		CppStandard = CppStandardVersion.Cpp20;

		// Jeder Fachordner ist ein Include-Pfad; der engine-unabhaengige Kern liegt unter Core/Public.
		string[] Folders = { "Core", "Core/Public", "Characters", "Vehicles", "Traffic", "World", "NPC",
			"Missions", "Economy", "Dialogue", "Communication", "InternetCafe", "Audio", "Weather",
			"SaveSystem", "UI" };
		foreach (string Folder in Folders)
		{
			PublicIncludePaths.Add(Path.Combine(ModuleDirectory, Folder));
		}

		PublicDependencyModuleNames.AddRange(new string[] {
			"Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput",
			"ChaosVehicles", "PhysicsCore", "GameplayTags", "Json", "JsonUtilities"
		});
		PrivateDependencyModuleNames.AddRange(new string[] { "Projects" });
	}
}
