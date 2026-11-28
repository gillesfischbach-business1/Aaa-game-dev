#include "LuxCore/Dialogue.h"

#include <deque>

namespace lux98 {

const char* ToCode(Lang l) {
    switch (l) {
        case Lang::LB: return "lb";
        case Lang::DE: return "de";
        case Lang::FR: return "fr";
        case Lang::EN: return "en";
    }
    return "de";
}

bool LocalizedText::Has(Lang l) const {
    auto it = text.find(l);
    return it != text.end() && !it->second.empty();
}

std::string LocalizedText::Get(Lang l) const {
    for (Lang candidate : {l, Lang::DE, Lang::LB}) {
        if (Has(candidate)) return text.at(candidate);
    }
    for (const auto& kv : text)
        if (!kv.second.empty()) return kv.second;
    return "";
}

bool FlagCondition::Holds(const std::set<std::string>& flags) const {
    for (const auto& f : requireSet)
        if (!flags.count(f)) return false;
    for (const auto& f : requireUnset)
        if (flags.count(f)) return false;
    return true;
}

bool DialogueGraph::Add(DialogueNode node, std::string* error) {
    if (node.id.empty() || nodes_.count(node.id)) {
        if (error) *error = "Knoten-ID leer oder doppelt: " + node.id;
        return false;
    }
    const std::string id = node.id;
    nodes_.emplace(id, std::move(node));
    return true;
}

const DialogueNode* DialogueGraph::Find(const std::string& id) const {
    auto it = nodes_.find(id);
    return it == nodes_.end() ? nullptr : &it->second;
}

std::vector<DialogueIssue> DialogueGraph::Validate(const std::string& startId) const {
    std::vector<DialogueIssue> issues;
    auto target = [&](const std::string& from, const std::string& to) {
        if (!to.empty() && !nodes_.count(to)) issues.push_back({from, "Ziel fehlt: " + to});
    };
    for (const auto& [id, n] : nodes_) {
        if (!n.text.Has(Lang::LB)) issues.push_back({id, "luxemburgischer Text fehlt"});
        if (!n.text.Has(Lang::DE)) issues.push_back({id, "deutscher Untertitel fehlt"});
        target(id, n.next);
        target(id, n.skipTo);
        for (const auto& c : n.choices) {
            target(id, c.next);
            if (!c.text.Has(Lang::DE)) issues.push_back({id, "Auswahltext ohne Deutsch"});
        }
        if (!n.choices.empty() && !n.next.empty()) issues.push_back({id, "Knoten hat Auswahl UND Folgeknoten"});
    }
    // Erreichbarkeit ab Start (Breitensuche)
    if (!nodes_.count(startId)) {
        issues.push_back({startId, "Startknoten fehlt"});
        return issues;
    }
    std::set<std::string> seen{startId};
    std::deque<std::string> queue{startId};
    while (!queue.empty()) {
        const DialogueNode& n = nodes_.at(queue.front());
        queue.pop_front();
        std::vector<std::string> outs{n.next, n.skipTo};
        for (const auto& c : n.choices) outs.push_back(c.next);
        for (const auto& o : outs)
            if (!o.empty() && nodes_.count(o) && seen.insert(o).second) queue.push_back(o);
    }
    for (const auto& kv : nodes_)
        if (!seen.count(kv.first)) issues.push_back({kv.first, "nicht erreichbar"});
    return issues;
}

bool DialogueRunner::Enter(const std::string& id) {
    // Uebersprungene Knoten folgen ihrem skipTo; Schutz gegen Endlosschleifen
    std::string cur = id;
    for (int guard = 0; guard < 64 && !cur.empty(); ++guard) {
        const DialogueNode* n = graph_.Find(cur);
        if (!n) break;
        if (!n->condition.Holds(flags_)) {
            cur = n->skipTo;
            continue;
        }
        current_ = n;
        history_.push_back(n->id);
        for (const auto& f : n->setFlags) flags_.insert(f);
        return true;
    }
    current_ = nullptr;
    return false;
}

bool DialogueRunner::Start(const std::string& nodeId) {
    history_.clear();
    return Enter(nodeId);
}

std::string DialogueRunner::Spoken() const { return current_ ? current_->text.Get(Lang::LB) : ""; }
std::string DialogueRunner::Subtitle(Lang l) const { return current_ ? current_->text.Get(l) : ""; }

std::vector<std::pair<size_t, std::string>> DialogueRunner::VisibleChoices(Lang l) const {
    std::vector<std::pair<size_t, std::string>> out;
    if (!current_) return out;
    for (size_t i = 0; i < current_->choices.size(); ++i)
        if (current_->choices[i].condition.Holds(flags_)) out.emplace_back(i, current_->choices[i].text.Get(l));
    return out;
}

bool DialogueRunner::Advance() {
    if (!current_ || !current_->choices.empty()) return false;
    if (current_->next.empty()) {
        current_ = nullptr;
        return false;
    }
    return Enter(current_->next);
}

bool DialogueRunner::Choose(size_t index) {
    if (!current_ || index >= current_->choices.size()) return false;
    const DialogueChoice& c = current_->choices[index];
    if (!c.condition.Holds(flags_)) return false;
    for (const auto& f : c.setFlags) flags_.insert(f);
    if (c.next.empty()) {
        current_ = nullptr;
        return false;
    }
    return Enter(c.next);
}

}  // namespace lux98
