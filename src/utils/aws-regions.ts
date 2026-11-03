export type AwsRegionChoice = { value: string; label: string };

/**
 * AWS regions where Bedrock is commonly available. Keep the region id in the
 * value because LiteLLM and boto3 use the id, while the label gives users a
 * readable location. The server may provide a more current choices list; the
 * settings field uses that list when present and falls back to this catalog.
 */
export const AWS_REGION_CHOICES: readonly AwsRegionChoice[] = [
  { value: "us-east-1", label: "US East (N. Virginia) — us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) — us-east-2" },
  { value: "us-west-1", label: "US West (N. California) — us-west-1" },
  { value: "us-west-2", label: "US West (Oregon) — us-west-2" },
  { value: "af-south-1", label: "Africa (Cape Town) — af-south-1" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) — ap-northeast-1" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul) — ap-northeast-2" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka) — ap-northeast-3" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) — ap-south-1" },
  {
    value: "ap-southeast-1",
    label: "Asia Pacific (Singapore) — ap-southeast-1",
  },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) — ap-southeast-2" },
  { value: "ca-central-1", label: "Canada (Central) — ca-central-1" },
  { value: "eu-central-1", label: "Europe (Frankfurt) — eu-central-1" },
  { value: "eu-north-1", label: "Europe (Stockholm) — eu-north-1" },
  { value: "eu-south-1", label: "Europe (Milan) — eu-south-1" },
  { value: "eu-west-1", label: "Europe (Ireland) — eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) — eu-west-2" },
  { value: "eu-west-3", label: "Europe (Paris) — eu-west-3" },
  { value: "il-central-1", label: "Israel (Tel Aviv) — il-central-1" },
  { value: "me-central-1", label: "Middle East (UAE) — me-central-1" },
  { value: "sa-east-1", label: "South America (São Paulo) — sa-east-1" },
  { value: "us-gov-east-1", label: "AWS GovCloud (US-East) — us-gov-east-1" },
  { value: "us-gov-west-1", label: "AWS GovCloud (US-West) — us-gov-west-1" },
  { value: "cn-north-1", label: "China (Beijing) — cn-north-1" },
  { value: "cn-northwest-1", label: "China (Ningxia) — cn-northwest-1" },
];
