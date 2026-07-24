import spacy

nlp = spacy.load("en_core_web_sm")

def extract_locations(text):

    doc = nlp(text)

    locations = []

    for ent in doc.ents:
        if ent.label_ == "GPE":
            locations.append(ent.text)

    if not locations:
        locations.append("New York")

    return locations