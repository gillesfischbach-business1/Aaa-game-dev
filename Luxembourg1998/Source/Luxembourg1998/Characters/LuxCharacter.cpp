#include "LuxCharacter.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "LuxInteractable.h"

ALuxCharacter::ALuxCharacter()
{
	GetCapsuleComponent()->InitCapsuleSize(34.f, 88.f);

	bUseControllerRotationYaw = false;
	GetCharacterMovement()->bOrientRotationToMovement = true;
	GetCharacterMovement()->RotationRate = FRotator(0.f, 400.f, 0.f);
	GetCharacterMovement()->MaxWalkSpeed = RunSpeed;
	GetCharacterMovement()->MaxWalkSpeedCrouched = 120.f;
	GetCharacterMovement()->JumpZVelocity = 380.f;
	GetCharacterMovement()->MaxStepHeight = 35.f;          // Bordsteine und Treppenstufen
	GetCharacterMovement()->SetWalkableFloorAngle(50.f);   // steile Gassen im Grund

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 320.f;
	CameraBoom->SocketOffset = FVector(0.f, 45.f, 60.f);
	CameraBoom->bUsePawnControlRotation = true;
	CameraBoom->bEnableCameraLag = true;
	CameraBoom->CameraLagSpeed = 12.f;

	ThirdPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ThirdPersonCamera"));
	ThirdPersonCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);

	FirstPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
	FirstPersonCamera->SetupAttachment(GetCapsuleComponent());
	FirstPersonCamera->SetRelativeLocation(FVector(10.f, 0.f, 70.f));
	FirstPersonCamera->bUsePawnControlRotation = true;
	FirstPersonCamera->SetActive(false);
}

void ALuxCharacter::BeginPlay()
{
	Super::BeginPlay();
	if (const APlayerController* PC = Cast<APlayerController>(GetController()))
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
				ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			if (DefaultMappingContext)
			{
				Subsystem->AddMappingContext(DefaultMappingContext, 0);
			}
		}
	}
}

void ALuxCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!Input)
	{
		return;
	}
	if (MoveAction) Input->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ALuxCharacter::Move);
	if (LookAction) Input->BindAction(LookAction, ETriggerEvent::Triggered, this, &ALuxCharacter::Look);
	if (JumpAction)
	{
		Input->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump);
		Input->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
	}
	if (SprintAction)
	{
		Input->BindAction(SprintAction, ETriggerEvent::Started, this, &ALuxCharacter::StartSprint);
		Input->BindAction(SprintAction, ETriggerEvent::Completed, this, &ALuxCharacter::StopSprint);
	}
	if (InteractAction) Input->BindAction(InteractAction, ETriggerEvent::Started, this, &ALuxCharacter::TryInteract);
	if (ToggleViewAction) Input->BindAction(ToggleViewAction, ETriggerEvent::Started, this, &ALuxCharacter::ToggleView);
}

void ALuxCharacter::Move(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (!Controller)
	{
		return;
	}
	const FRotator Yaw(0.f, Controller->GetControlRotation().Yaw, 0.f);
	AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::X), Axis.Y);
	AddMovementInput(FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y), Axis.X);
}

void ALuxCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(Axis.Y);
}

void ALuxCharacter::StartSprint() { GetCharacterMovement()->MaxWalkSpeed = SprintSpeed; }
void ALuxCharacter::StopSprint() { GetCharacterMovement()->MaxWalkSpeed = RunSpeed; }

void ALuxCharacter::TryInteract()
{
	const UCameraComponent* Cam = bFirstPerson ? FirstPersonCamera.Get() : ThirdPersonCamera.Get();
	// Strahl ab Kopfhoehe in Blickrichtung, damit die Third-Person-Kamera nicht "durch" die Figur zielt.
	const FVector Start = GetActorLocation() + FVector(0.f, 0.f, 60.f);
	const FVector End = Start + Cam->GetForwardVector() * InteractionDistance;
	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(LuxInteract), false, this);
	if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params))
	{
		AActor* Target = Hit.GetActor();
		if (Target && Target->Implements<ULuxInteractable>())
		{
			ILuxInteractable::Execute_Interact(Target, this);
		}
	}
}

void ALuxCharacter::SetFirstPerson(bool bEnable)
{
	bFirstPerson = bEnable;
	FirstPersonCamera->SetActive(bEnable);
	ThirdPersonCamera->SetActive(!bEnable);
	bUseControllerRotationYaw = bEnable;
	GetCharacterMovement()->bOrientRotationToMovement = !bEnable;
	GetMesh()->SetOwnerNoSee(false);  // Koerper bleibt sichtbar (Fuesse/Haende in First Person)
}

void ALuxCharacter::ToggleView() { SetFirstPerson(!bFirstPerson); }
