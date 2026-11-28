#include "LuxGameMode.h"

#include "LuxCharacter.h"

ALuxGameMode::ALuxGameMode()
{
	DefaultPawnClass = ALuxCharacter::StaticClass();
}
