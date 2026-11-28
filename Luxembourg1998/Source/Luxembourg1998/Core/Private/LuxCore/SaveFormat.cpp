#include "LuxCore/SaveFormat.h"

#include <cstdio>
#include <fstream>
#include <sstream>

namespace lux98 {
namespace {
const char* kHeader = "LUX98SAVE";

// Schluessel/Werte duerfen keine Zeilenumbrueche enthalten -> maskieren.
std::string Escape(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '=') out += "\\e";
        else out += c;
    }
    return out;
}
std::string Unescape(const std::string& s) {
    std::string out;
    for (size_t i = 0; i < s.size(); ++i) {
        if (s[i] == '\\' && i + 1 < s.size()) {
            char n = s[++i];
            out += n == 'n' ? '\n' : n == 'r' ? '\r' : n == 'e' ? '=' : n;
        } else {
            out += s[i];
        }
    }
    return out;
}

// Hier werden kuenftige Formatversionen schrittweise angehoben (v1 -> v2 -> ...).
bool MigrateSave(int fromVersion, SaveData& /*data*/) { return fromVersion == kCurrentSaveVersion; }
}  // namespace

std::uint32_t Crc32(const std::string& data) {
    std::uint32_t crc = 0xFFFFFFFFu;
    for (unsigned char c : data) {
        crc ^= c;
        for (int k = 0; k < 8; ++k) crc = (crc >> 1) ^ (0xEDB88320u & (0u - (crc & 1u)));
    }
    return ~crc;
}

const char* ToString(SaveError e) {
    switch (e) {
        case SaveError::None: return "ok";
        case SaveError::BadHeader: return "kein LUX98-Spielstand";
        case SaveError::BadVersion: return "Versionszeile fehlt oder ungueltig";
        case SaveError::BadChecksum: return "Pruefsumme falsch (Datei beschaedigt)";
        case SaveError::BadLine: return "ungueltige Zeile";
        case SaveError::NewerVersion: return "Spielstand stammt aus einer neueren Spielversion";
    }
    return "?";
}

std::string SerializeSave(const SaveData& data, int version) {
    std::string body = std::string(kHeader) + "\nversion=" + std::to_string(version) + "\n";
    for (const auto& [k, v] : data) body += Escape(k) + "=" + Escape(v) + "\n";
    char crc[16];
    std::snprintf(crc, sizeof(crc), "%08x", Crc32(body));
    return body + "crc32=" + crc + "\n";
}

std::optional<SaveData> ParseSave(const std::string& text, SaveError* error) {
    auto fail = [&](SaveError e) -> std::optional<SaveData> { if (error) *error = e; return std::nullopt; };
    const size_t crcPos = text.rfind("crc32=");
    if (text.rfind(kHeader, 0) != 0) return fail(SaveError::BadHeader);
    if (crcPos == std::string::npos) return fail(SaveError::BadChecksum);
    const std::string body = text.substr(0, crcPos);
    std::uint32_t stored = 0;
    if (std::sscanf(text.c_str() + crcPos, "crc32=%8x", &stored) != 1 || stored != Crc32(body))
        return fail(SaveError::BadChecksum);

    std::istringstream in(body);
    std::string line;
    std::getline(in, line);  // Kopf
    int version = 0;
    if (!std::getline(in, line) || std::sscanf(line.c_str(), "version=%d", &version) != 1 || version < 1)
        return fail(SaveError::BadVersion);
    if (version > kCurrentSaveVersion) return fail(SaveError::NewerVersion);

    SaveData data;
    while (std::getline(in, line)) {
        if (line.empty()) continue;
        const size_t eq = line.find('=');
        if (eq == std::string::npos || eq == 0) return fail(SaveError::BadLine);
        data[Unescape(line.substr(0, eq))] = Unescape(line.substr(eq + 1));
    }
    if (!MigrateSave(version, data)) return fail(SaveError::BadVersion);
    if (error) *error = SaveError::None;
    return data;
}

bool WriteSaveFile(const std::string& path, const SaveData& data, std::string* error) {
    const std::string tmp = path + ".tmp";
    {
        std::ofstream out(tmp, std::ios::binary | std::ios::trunc);
        out << SerializeSave(data);
        out.flush();
        if (!out) { if (error) *error = "Schreiben fehlgeschlagen: " + tmp; return false; }
    }
    // Vorherigen gueltigen Stand als Sicherung behalten.
    if (std::ifstream(path).good()) {
        std::remove((path + ".bak").c_str());
        std::rename(path.c_str(), (path + ".bak").c_str());
    }
    if (std::rename(tmp.c_str(), path.c_str()) != 0) {
        if (error) *error = "Umbenennen fehlgeschlagen: " + path;
        return false;
    }
    return true;
}

std::optional<SaveData> ReadSaveFile(const std::string& path, bool* usedBackup, SaveError* error) {
    auto readAll = [](const std::string& p) -> std::optional<std::string> {
        std::ifstream in(p, std::ios::binary);
        if (!in) return std::nullopt;
        std::ostringstream ss;
        ss << in.rdbuf();
        return ss.str();
    };
    if (usedBackup) *usedBackup = false;
    if (auto text = readAll(path)) {
        if (auto data = ParseSave(*text, error)) return data;
    }
    if (auto text = readAll(path + ".bak")) {
        SaveError backupErr = SaveError::None;
        if (auto data = ParseSave(*text, &backupErr)) {
            if (usedBackup) *usedBackup = true;
            return data;
        }
    }
    return std::nullopt;
}

}  // namespace lux98
