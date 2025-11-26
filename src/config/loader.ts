import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { resolve } from 'path';
import { configSchema, type Config } from './schema.js';

/**
 * Load and validate configuration from YAML file
 */
export class ConfigLoader {
  private config: Config | null = null;

  /**
   * Load configuration from file
   * @param configPath - Path to config.yaml file
   * @returns Validated configuration object
   */
  load(configPath: string = './data/config.yaml'): Config {
    const absolutePath = resolve(configPath);

    // Check if config file exists
    if (!existsSync(absolutePath)) {
      throw new Error(
        `Configuration file not found: ${absolutePath}\n` +
          'Please copy data/config.example.yaml to data/config.yaml and customize it.'
      );
    }

    try {
      // Read YAML file
      const fileContents = readFileSync(absolutePath, 'utf-8');

      // Parse YAML
      const rawConfig = parseYaml(fileContents);

      // Replace environment variables
      const processedConfig = this.replaceEnvironmentVariables(rawConfig);

      // Validate with Zod schema
      const validatedConfig = configSchema.parse(processedConfig);

      this.config = validatedConfig;
      return validatedConfig;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get currently loaded configuration
   * @throws Error if no configuration is loaded
   */
  get(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Recursively replace environment variables in configuration
   * Supports ${VAR_NAME} syntax
   */
  private replaceEnvironmentVariables(obj: any): any {
    if (typeof obj === 'string') {
      // Match ${VAR_NAME} pattern
      const envVarPattern = /\$\{([A-Z_]+)\}/g;
      return obj.replace(envVarPattern, (_match, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new Error(
            `Environment variable ${varName} is not set.\n` +
              `Please set it in your .env file or environment.`
          );
        }
        return value;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceEnvironmentVariables(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvironmentVariables(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate configuration without loading from file
   * Useful for testing
   */
  validate(rawConfig: unknown): Config {
    return configSchema.parse(rawConfig);
  }
}

/**
 * Singleton instance for easy access
 */
export const configLoader = new ConfigLoader();

/**
 * Load configuration (convenience function)
 */
export function loadConfig(configPath?: string): Config {
  return configLoader.load(configPath);
}

/**
 * Get currently loaded configuration (convenience function)
 */
export function getConfig(): Config {
  return configLoader.get();
}
