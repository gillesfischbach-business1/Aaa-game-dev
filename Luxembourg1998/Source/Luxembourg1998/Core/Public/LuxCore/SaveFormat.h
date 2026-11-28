// LUX98 – Versioniertes, pruefsummengeschuetztes Spielstandformat mit Sicherungskopie.
// Aufbau (Text, UTF-8):
//   LUX98SAVE
//   version=1
//   key=value            (beliebig viele, sortiert)
//   crc32=1a2b3c4d       (Pruefsumme ueber alle Zeilen davor)
// Der Unreal-USaveGame-Wrapper speichert diesen Text; so bleibt das Format engine-unabhaengig testbar.
#pragma once

#include <cstdint>
#include <map>
#include <optional>
#include <string>

namespace lux98 {

using SaveData = std::map<std::string, std::string>;

constexpr int kCurrentSaveVersion = 1;

std::uint32_t Crc32(const std::string& data);

std::string SerializeSave(const SaveData& data, int version = kCurrentSaveVersion);

enum class SaveError { None, BadHeader, BadVersion, BadChecksum, BadLine, NewerVersion };
const char* ToString(SaveError e);

// Prueft Kopf, Version und Pruefsumme. Aeltere Versionen werden ueber MigrateSave angehoben.
std::optional<SaveData> ParseSave(const std::string& text, SaveError* error = nullptr);

// Speichert atomar: erst <path>.tmp schreiben, alte Datei nach <path>.bak, dann umbenennen.
bool WriteSaveFile(const std::string& path, const SaveData& data, std::string* error = nullptr);

// Laedt <path>; ist die Datei beschaedigt, wird automatisch <path>.bak versucht.
std::optional<SaveData> ReadSaveFile(const std::string& path, bool* usedBackup = nullptr,
                                     SaveError* error = nullptr);

}  // namespace lux98
