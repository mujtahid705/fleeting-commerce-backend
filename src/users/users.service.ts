import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  // find all users
  async findAll() {
    const users = await this.databaseService.user.findMany();
    return users;
  }
}
