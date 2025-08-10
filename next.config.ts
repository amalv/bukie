import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

export default createVanillaExtractPlugin()(nextConfig);
