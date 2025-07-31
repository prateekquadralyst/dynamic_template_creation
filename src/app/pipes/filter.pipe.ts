import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], filterValue: string, filterProperty: string = 'id'): any[] {
    if (!items || !filterValue) {
      return items;
    }

    // Find the item with matching property
    return items.filter(item => item[filterProperty] === filterValue);
  }
}