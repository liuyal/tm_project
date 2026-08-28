import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { LoaderComponent } from '../loader/loader.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '../empty-state/empty.state.component';
import { ErrorStateComponent } from '../error-state/error.state.component';
import { StatusBadgeComponent } from '../status-badge/status.badge.component';
import { PaginationComponent } from '../pagination/pagination.component';
import { FolderTreeComponent, FolderNode, buildFolderTree, isFolderPathMatch } from '../folder-tree/folder.tree.component';
import { TestCasesService, TestCases } from '../../services/tm.cases.service';

@Component({
  selector: 'app-tm-cases-table',
  standalone: true,
  imports: [
    MatTableModule,
    MatTooltipModule,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    PaginationComponent,
    FolderTreeComponent
  ],
  styleUrls: ['./tm.case.table.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './tm.case.table.component.html'
})

export class TmCasesTableComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);
  route = inject(ActivatedRoute);
  testCasesDataSource: MatTableDataSource<TestCases>;
  isLoading = false;
  error = '';
  projectKey = '';
  displayedColumns = ['KEY', 'TITLE', 'LABELS', 'FREQUENCY', 'RESULT', 'STATUS'];

  folderTree: FolderNode[] = [];
  selectedFolder: string | null = null;

  pageIndex = 0;
  pageSize = 100;
  readonly pageSizeOptions = [100, 50, 20];

  constructor(
    private testCasesService: TestCasesService
  ) {
    this.testCasesDataSource = new MatTableDataSource<TestCases>([]);
  }

  get filteredTestCases(): TestCases[] {
    return this.testCasesDataSource.data.filter(testCase => isFolderPathMatch(testCase.folder, this.selectedFolder));
  }

  get totalItems(): number {
    return this.filteredTestCases.length;
  }

  get pagedTestCases(): TestCases[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredTestCases.slice(start, start + this.pageSize);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 0;
  }

  loadTestCases() {
    this.isLoading = true;
    this.error = '';
    this.testCasesService.getTestCasesbyProjectKey(this.projectKey).subscribe({
      next: (response) => {
        this.testCasesDataSource.data = Array.isArray(response) ? response : [];
        this.folderTree = buildFolderTree(this.testCasesDataSource.data.map(testCase => testCase.folder));
        this.selectedFolder = null;
        this.pageIndex = 0;
        console.log('Test cases data loaded:', this.testCasesDataSource.data);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching test cases data:', error);
        this.error = `Error fetching test cases data: ${error.message || error}`;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onFolderSelected(path: string | null): void {
    this.selectedFolder = path;
    this.pageIndex = 0;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectKey = params['projectKey'];
      console.log('Test cases tab for project:', this.projectKey);
      this.loadTestCases();
    });
  }

  sortLabels(labels: any[]): any[] {
    if (!labels) return [];
    return [...labels].sort((a, b) => String(a).localeCompare(String(b)));
  }

  onCaseClick(event: MouseEvent, caseKey: string) {
    if (event.button === 1) {
      // Middle mouse button
      event.preventDefault();
      if (event.type === 'mousedown') {
        const url = this.router.serializeUrl(this.router.createUrlTree(['/projects', this.projectKey, 'case', caseKey]));
        window.open(url, '_blank');
      }
    } else if (event.button === 0 && event.type === 'click') {
      // Left mouse button
      this.router.navigate(['/projects', this.projectKey, 'case', caseKey]);
    }
  }
}

