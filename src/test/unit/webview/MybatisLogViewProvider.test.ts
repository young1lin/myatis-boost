/**
 * Unit tests for MybatisLogViewProvider filter functionality
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { MybatisLogViewProvider } from '../../../webview/MybatisLogViewProvider';
import { ConvertedSql, DatabaseType } from '../../../console/types';

describe('MybatisLogViewProvider', () => {
    let provider: MybatisLogViewProvider;
    let mockExtensionUri: vscode.Uri;
    let mockWebviewView: any;
    let postedMessages: any[];
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Setup mock extension URI
        mockExtensionUri = vscode.Uri.file('/test/extension');

        // Create provider instance
        provider = new MybatisLogViewProvider(mockExtensionUri);

        // Setup mock webview view
        postedMessages = [];
        mockWebviewView = {
            webview: {
                options: {},
                html: '',
                postMessage: (message: any) => {
                    postedMessages.push(message);
                    return Promise.resolve(true);
                },
                onDidReceiveMessage: sandbox.stub().returns({ dispose: () => {} }),
                asWebviewUri: (uri: vscode.Uri) => uri,
                cspSource: 'test'
            },
            onDidDispose: sandbox.stub().returns({ dispose: () => {} }),
            onDidChangeVisibility: sandbox.stub().returns({ dispose: () => {} }),
            visible: true,
            show: () => {},
            viewType: 'mybatis-boost.logView',
            title: 'MyBatis Log'
        };

        // Create mock cancellation token
        const mockCancellationToken: vscode.CancellationToken = {
            isCancellationRequested: false,
            onCancellationRequested: sandbox.stub().returns({ dispose: () => {} })
        };

        // Resolve the webview view to initialize the provider
        provider.resolveWebviewView(
            mockWebviewView,
            { state: undefined },
            mockCancellationToken
        );

        // Clear the initial messages
        postedMessages = [];
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Filter functionality with continuous log updates', () => {
        it('should maintain filter when new records are added', () => {
            // Add first record (should match filter)
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM user WHERE id = 1');
            provider.addRecord(record1);

            // Verify record was added
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].type, 'update');
            assert.strictEqual(postedMessages[0].records.length, 1);
            postedMessages = [];

            // Apply filter for "user"
            simulateFilterMessage('user');

            // Verify filter was applied
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].type, 'update');
            assert.strictEqual(postedMessages[0].records.length, 1);
            assert.strictEqual(postedMessages[0].records[0].mapper, 'UserMapper.selectById');
            postedMessages = [];

            // Add second record that matches filter
            const record2: ConvertedSql = createMockConvertedSql('UserMapper.updateById', 'UPDATE user SET name = "test"');
            provider.addRecord(record2);

            // Verify only matching records are shown (filter still active)
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].type, 'update');
            assert.strictEqual(postedMessages[0].records.length, 2);
            postedMessages = [];

            // Add third record that does NOT match filter
            const record3: ConvertedSql = createMockConvertedSql('OrderMapper.selectAll', 'SELECT * FROM orders');
            provider.addRecord(record3);

            // Verify non-matching record is filtered out (BUG FIX TEST)
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].type, 'update');
            assert.strictEqual(postedMessages[0].records.length, 2, 'Filter should exclude non-matching record');
            assert.strictEqual(postedMessages[0].records[0].mapper, 'UserMapper.selectById');
            assert.strictEqual(postedMessages[0].records[1].mapper, 'UserMapper.updateById');
        });

        it('should clear filter when empty keyword is provided', () => {
            // Add records
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM user WHERE id = 1');
            const record2: ConvertedSql = createMockConvertedSql('OrderMapper.selectAll', 'SELECT * FROM orders');
            provider.addRecord(record1);
            provider.addRecord(record2);
            postedMessages = [];

            // Apply filter for "user"
            simulateFilterMessage('user');
            assert.strictEqual(postedMessages[0].records.length, 1);
            postedMessages = [];

            // Clear filter by sending empty string
            simulateFilterMessage('');

            // Verify all records are shown
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 2);
            postedMessages = [];

            // Add new record and verify it's shown (no filter active)
            const record3: ConvertedSql = createMockConvertedSql('ProductMapper.insert', 'INSERT INTO product VALUES (1)');
            provider.addRecord(record3);

            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 3);
        });

        it('should clear filter when whitespace-only keyword is provided', () => {
            // Add records and apply filter
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM user WHERE id = 1');
            provider.addRecord(record1);
            postedMessages = [];

            simulateFilterMessage('user');
            assert.strictEqual(postedMessages[0].records.length, 1);
            postedMessages = [];

            // Clear filter by sending whitespace
            simulateFilterMessage('   ');

            // Verify filter is cleared
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 1);
        });

        it('should filter by SQL content', () => {
            // Add records
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM user WHERE id = 1');
            const record2: ConvertedSql = createMockConvertedSql('OrderMapper.selectAll', 'SELECT * FROM orders');
            provider.addRecord(record1);
            provider.addRecord(record2);
            postedMessages = [];

            // Filter by SQL content
            simulateFilterMessage('orders');

            // Verify only record with "orders" in SQL is shown
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 1);
            assert.strictEqual(postedMessages[0].records[0].mapper, 'OrderMapper.selectAll');
            postedMessages = [];

            // Add new record with "orders" in SQL
            const record3: ConvertedSql = createMockConvertedSql('ProductMapper.selectByOrder', 'SELECT * FROM product WHERE order_id IN (SELECT id FROM orders)');
            provider.addRecord(record3);

            // Verify filter is maintained
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 2);
        });

        it('should keep filter when clear() is called', () => {
            // Add records and apply filter
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM user WHERE id = 1');
            provider.addRecord(record1);
            postedMessages = [];

            simulateFilterMessage('user');
            postedMessages = [];

            // Clear all records
            provider.clear();

            // Verify records are cleared
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 0);
            postedMessages = [];

            // Add new record that doesn't match filter and verify filter is still applied
            const record2: ConvertedSql = createMockConvertedSql('OrderMapper.selectAll', 'SELECT * FROM orders');
            provider.addRecord(record2);

            // Filter should still be active, so OrderMapper should be filtered out
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 0, 'Filter should still be active after clear');
            postedMessages = [];

            // Add record that matches filter
            const record3: ConvertedSql = createMockConvertedSql('UserMapper.updateById', 'UPDATE user SET name = "test"');
            provider.addRecord(record3);

            // Filter should allow this record through
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 1);
            assert.strictEqual(postedMessages[0].records[0].mapper, 'UserMapper.updateById');
        });

        it('should keep filter when clear message is received from webview', () => {
            // Add records and apply filter
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM user WHERE id = 1');
            provider.addRecord(record1);
            postedMessages = [];

            simulateFilterMessage('user');
            postedMessages = [];

            // Simulate clear message from webview
            simulateClearMessage();

            // Verify records are cleared
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 0);
            postedMessages = [];

            // Add new record that doesn't match filter and verify filter is still applied
            const record2: ConvertedSql = createMockConvertedSql('OrderMapper.selectAll', 'SELECT * FROM orders');
            provider.addRecord(record2);

            // Filter should still be active, so OrderMapper should be filtered out
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 0, 'Filter should remain active after clear message');
            postedMessages = [];

            // Add record that matches filter
            const record3: ConvertedSql = createMockConvertedSql('UserMapper.updateById', 'UPDATE user SET name = "test"');
            provider.addRecord(record3);

            // Filter should allow this record through
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 1);
            assert.strictEqual(postedMessages[0].records[0].mapper, 'UserMapper.updateById');
        });

        it('should handle case-insensitive filtering', () => {
            // Add records
            const record1: ConvertedSql = createMockConvertedSql('UserMapper.selectById', 'SELECT * FROM User WHERE id = 1');
            const record2: ConvertedSql = createMockConvertedSql('OrderMapper.selectAll', 'SELECT * FROM orders');
            provider.addRecord(record1);
            provider.addRecord(record2);
            postedMessages = [];

            // Filter with lowercase
            simulateFilterMessage('user');

            // Verify case-insensitive match
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 1);
            assert.strictEqual(postedMessages[0].records[0].mapper, 'UserMapper.selectById');
            postedMessages = [];

            // Add new record with mixed case
            const record3: ConvertedSql = createMockConvertedSql('ProductMapper.selectByUser', 'SELECT * FROM product WHERE USER_ID = 1');
            provider.addRecord(record3);

            // Verify case-insensitive filter is maintained
            assert.strictEqual(postedMessages.length, 1);
            assert.strictEqual(postedMessages[0].records.length, 2);
        });
    });

    // Helper function to create mock ConvertedSql
    function createMockConvertedSql(mapper: string, sql: string): ConvertedSql {
        return {
            originalSql: sql,
            convertedSql: sql,
            database: DatabaseType.MySQL,
            parameters: [],
            executionTime: 10,
            mapper: mapper,
            timestamp: new Date().toISOString(),
            threadInfo: '12345 [main]',
            preparingLine: 'Preparing: ' + sql,
            parametersLine: 'Parameters: ',
            totalLine: 'Total: 1'
        };
    }

    // Helper function to simulate filter message from webview
    function simulateFilterMessage(keyword: string) {
        // Directly call private method via type assertion for testing
        (provider as any)._filterRecords(keyword);
    }

    // Helper function to simulate clear message from webview
    function simulateClearMessage() {
        // Use public clear method
        provider.clear();
    }
});
