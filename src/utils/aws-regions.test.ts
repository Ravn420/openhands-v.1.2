import { describe, expect, it } from "vitest";
import { AWS_REGION_CHOICES } from "./aws-regions";

describe("AWS region choices", () => {
  it("includes the commercial Bedrock regions and keeps region ids as values", () => {
    expect(AWS_REGION_CHOICES).toContainEqual({
      value: "us-east-1",
      label: "US East (N. Virginia) — us-east-1",
    });
    expect(AWS_REGION_CHOICES).toContainEqual({
      value: "us-west-2",
      label: "US West (Oregon) — us-west-2",
    });
    expect(AWS_REGION_CHOICES.every(({ value }) => value.length > 0)).toBe(
      true,
    );
  });
});
