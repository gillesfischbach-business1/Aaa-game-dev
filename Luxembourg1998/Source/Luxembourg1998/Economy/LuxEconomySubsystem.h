#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "LuxCore/Economy.h"
#include "LuxEconomySubsystem.generated.h"

// Geld des Spielers in Luxemburger Franken. Startwerte sind Spielbalance (Kategorie D), keine Historie.
UCLASS()
class LUXEMBOURG1998_API ULuxEconomySubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintPure, Category = "LUX98|Economy")
	int64 GetCash() const { return Wallet.Cash(); }

	UFUNCTION(BlueprintPure, Category = "LUX98|Economy")
	int64 GetBank() const { return Wallet.Bank(); }

	UFUNCTION(BlueprintPure, Category = "LUX98|Economy")
	static FString FormatLuf(int64 Amount) { return UTF8_TO_TCHAR(lux98::FormatLuf(Amount).c_str()); }

	lux98::Wallet& GetWallet() { return Wallet; }
	void ResetWallet(int64 Cash, int64 Bank) { Wallet = lux98::Wallet(Cash, Bank); }

private:
	lux98::Wallet Wallet{0, 0};
};
