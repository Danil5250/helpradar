import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

/**
 * Keeps TypeScript properties in camelCase while database columns follow the snake_case
 * attribute names used by the SRS class descriptions (e.g. `date_posted`, `views_count`).
 */
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(className: string, customName: string | undefined): string {
    return customName ? customName : snakeCase(className);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return (
      snakeCase(embeddedPrefixes.concat('').join('_')) +
      (customName ? customName : snakeCase(propertyName))
    );
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./gi, '_')}_${secondTableName}`,
    );
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(`${tableName}_${columnName ? columnName : propertyName}`);
  }
}
