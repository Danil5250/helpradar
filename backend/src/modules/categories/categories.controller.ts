import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Help categories (SRS Appendix A.2)' })
  async findAll() {
    const items = await this.categories.findAll();
    return { items: items.map(({ id, name }) => ({ id, name })) };
  }
}
