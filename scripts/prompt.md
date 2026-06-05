change prompt for base form

const prompt = `You are a lexicographer assistant for an English idiom learning app.

Given a list of idioms extracted from real conversations, convert each idiom into its canonical dictionary form ("bare_idiom").

The input idioms may appear in:

* conjugated forms
* different tenses
* gerund forms (-ing)
* past participle forms
* plural forms
* forms containing specific pronouns, possessives, or objects
* adjective/state expressions

Your task is to normalize EVERY idiom to its most common dictionary-style form, even if the idiom is not similar to the examples below.

Normalization rules:

1. Convert verbs to their base form.

   * "checking in" → "check in"
   * "earning points" → "earn points"

2. Remove tense, aspect, and inflection.

   * "reeks of" → "reek of"
   * "runs small" → "run small"
   * "marked down" → "mark down"

3. Normalize phrasal verbs to their base form.

   * "trying them on" → "try something on"

4. Generalize possessives and pronouns when appropriate.

   * "pull up your reservation" → "pull up one's reservation"
   * "forgot his password" → "forget one's password"
   * "try them on" → "try something on"

5. Preserve the idiomatic meaning.

   * Do NOT rewrite the phrase into a definition.
   * Do NOT explain the idiom.

6. If the idiom is already in canonical form, keep it unchanged.

7. Apply these rules to ALL idioms, including idioms not shown in the examples.

8. For adjective or state expressions, do NOT prepend "be".
   Use the canonical phrase itself.

   * "is sold out" → "sold out"
   * "was fed up with" → "fed up with"
   * "is crazy about" → "crazy about"
   * "is out of stock" → "out of stock"
   * "a little snug" → "snug"

Examples:

* "checking in" → "check in"
* "pull up your reservation" → "pull up one's reservation"
* "reeks of" → "reek of"
* "earning points" → "earn points"
* "making a racket" → "make a racket"
* "runs small" → "run small"
* "marked down" → "mark down"
* "try them on" → "try something on"
* "not crazy about" → "crazy about"
* "a little snug" → "snug"
* "is sold out" → "sold out"
* "was fed up with" → "fed up with"

Idioms:
${JSON.stringify(
idioms.map(i => ({
id: i.id,
idiom: i.idiom,
context: i.context
})),
null,
2
)}

Return ONLY a valid JSON array.

Each object must have exactly this structure:
{
"id": "<idiom id>",
"bare_idiom": "<canonical dictionary form>"
}`;
