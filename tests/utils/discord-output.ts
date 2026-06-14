export type LabelValueRows = Record<string, string>;

type EmbedField = {
  name: string;
  value: string;
};

type EmbedJson = {
  fields?: EmbedField[];
};

type JsonEncodableEmbed = {
  toJSON: () => EmbedJson;
};

const parseLabelValueLine = (line: string) => {
  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    throw new Error(`Expected label-value line, got: ${line}`);
  }

  return {
    label: line.slice(0, separatorIndex).trim(),
    value: line.slice(separatorIndex + 1).trim(),
  };
};

const toEmbedJson = (embed: EmbedJson | JsonEncodableEmbed): EmbedJson =>
  'toJSON' in embed ? embed.toJSON() : embed;

export const textToLabelValueRows = (
  value: string | null | undefined,
): LabelValueRows => {
  if (!value) {
    return {};
  }

  return value.split(/\r?\n/).reduce<LabelValueRows>((rows, line) => {
    const { label, value: rowValue } = parseLabelValueLine(line);

    rows[label] = rowValue;

    return rows;
  }, {});
};

export const getEmbedFieldValue = (
  embed: EmbedJson | JsonEncodableEmbed,
  fieldName: string,
) => {
  const field = toEmbedJson(embed).fields?.find(
    (candidate) => candidate.name === fieldName,
  );

  return field?.value ?? null;
};

export const embedFieldToLabelValueRows = (
  embed: EmbedJson | JsonEncodableEmbed,
  fieldName: string,
) => textToLabelValueRows(getEmbedFieldValue(embed, fieldName));
