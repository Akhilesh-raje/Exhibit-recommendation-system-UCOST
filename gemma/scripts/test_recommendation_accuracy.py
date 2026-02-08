#!/usr/bin/env python3
"""
Test the accuracy score of exhibit recommendations.

This script:
1. Fetches all exhibits from the backend
2. Creates test cases with user profiles and expected recommendations
3. Tests the recommendation API endpoint
4. Calculates accuracy metrics (precision, recall, F1, MRR, etc.)
5. Generates a detailed report
"""
import os
import json
import sys
import requests
from typing import List, Dict, Set, Tuple
from collections import defaultdict
import math

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000/api')
RECOMMEND_URL = f"{BACKEND_URL}/tours/recommend"
EXHIBITS_URL = f"{BACKEND_URL}/exhibits"

class RecommendationAccuracyTester:
    def __init__(self):
        self.all_exhibits = []
        self.test_results = []
        self.metrics = {}
        
    def fetch_all_exhibits(self):
        """Fetch all exhibits from the backend"""
        print(f"Fetching exhibits from {EXHIBITS_URL}...")
        try:
            response = requests.get(EXHIBITS_URL, timeout=30)
            if response.ok:
                data = response.json()
                exhibits = data.get('exhibits', []) or data.get('data', []) or []
                print(f"✅ Fetched {len(exhibits)} exhibits")
                self.all_exhibits = exhibits
                return True
            else:
                print(f"❌ Failed to fetch exhibits: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error fetching exhibits: {e}")
            return False
    
    def find_exhibits_by_keywords(self, keywords: List[str], min_matches: int = 1) -> Set[str]:
        """Find exhibit IDs that match given keywords"""
        matches = set()
        keywords_lower = [k.lower() for k in keywords]
        
        for ex in self.all_exhibits:
            # Build searchable text
            search_text = ' '.join([
                ex.get('name', ''),
                ex.get('description', ''),
                ex.get('category', ''),
                ex.get('exhibitType', ''),
                ' '.join(ex.get('features', []) or ex.get('interactiveFeatures', []) or [])
            ]).lower()
            
            # Count keyword matches
            match_count = sum(1 for kw in keywords_lower if kw in search_text)
            if match_count >= min_matches:
                matches.add(ex.get('id'))
        
        return matches
    
    def create_test_cases(self) -> List[Dict]:
        """Create test cases with user profiles and expected recommendations"""
        test_cases = []
        
        if not self.all_exhibits:
            print("⚠️  No exhibits available for test case generation")
            return test_cases
        
        # Test Case 1: Physics interests
        physics_keywords = ['physics', 'force', 'motion', 'energy', 'gravity', 'electricity']
        physics_exhibits = self.find_exhibits_by_keywords(physics_keywords)
        if physics_exhibits:
            test_cases.append({
                'name': 'Physics Interest Match',
                'userProfile': {
                    'interests': ['physics', 'science'],
                    'ageBand': 'teens',
                    'groupType': 'student',
                    'groupSize': 2,
                    'timeBudget': 60,
                    'mobility': 'none',
                    'crowdTolerance': 'medium'
                },
                'selectedFloor': 'all',
                'expectedExhibitIds': list(physics_exhibits)[:5],  # Top 5 expected
                'expectedKeywords': physics_keywords
            })
        
        # Test Case 2: Family with children
        family_keywords = ['family', 'children', 'kid', 'interactive', 'hands-on']
        family_exhibits = self.find_exhibits_by_keywords(family_keywords)
        if family_exhibits:
            test_cases.append({
                'name': 'Family-Friendly Exhibits',
                'userProfile': {
                    'interests': ['interactive exhibits'],
                    'ageBand': 'kids',
                    'groupType': 'family',
                    'groupSize': 4,
                    'timeBudget': 90,
                    'mobility': 'none',
                    'crowdTolerance': 'medium'
                },
                'selectedFloor': 'all',
                'expectedExhibitIds': list(family_exhibits)[:5],
                'expectedKeywords': family_keywords
            })
        
        # Test Case 3: Specific category match (e.g., astronomy, biology, etc.)
        # Find categories from exhibits
        categories = set()
        for ex in self.all_exhibits:
            cat = ex.get('category', '').lower()
            if cat:
                categories.add(cat)
        
        if categories:
            test_cat = list(categories)[0]
            category_keywords = [test_cat]
            category_exhibits = self.find_exhibits_by_keywords(category_keywords)
            if category_exhibits:
                test_cases.append({
                    'name': f'{test_cat.title()} Category Match',
                    'userProfile': {
                        'interests': [test_cat],
                        'ageBand': 'adults',
                        'groupType': 'adult',
                        'groupSize': 1,
                        'timeBudget': 45,
                        'mobility': 'none',
                        'crowdTolerance': 'low'
                    },
                    'selectedFloor': 'all',
                    'expectedExhibitIds': list(category_exhibits)[:5],
                    'expectedKeywords': category_keywords
                })
        
        # Test Case 4: No specific interests (general recommendations)
        test_cases.append({
            'name': 'General Recommendations',
            'userProfile': {
                'interests': [],
                'ageBand': 'adults',
                'groupType': 'adult',
                'groupSize': 1,
                'timeBudget': 60,
                'mobility': 'none',
                'crowdTolerance': 'medium'
            },
            'selectedFloor': 'all',
            'expectedExhibitIds': [],  # No specific expectations
            'expectedKeywords': []
        })
        
        return test_cases
    
    def call_recommendation_api(self, user_profile: Dict, selected_floor: str) -> Tuple[List[Dict], bool]:
        """Call the recommendation API endpoint"""
        try:
            payload = {
                'userProfile': user_profile,
                'selectedFloor': selected_floor,
                'globalTimeBudget': True
            }
            response = requests.post(
                RECOMMEND_URL,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.ok:
                data = response.json()
                if data.get('success'):
                    exhibits = data.get('exhibits', [])
                    if not exhibits:
                        print(f"  ⚠️  No recommendations returned (may be filtered by constraints)")
                    return exhibits, True
                else:
                    print(f"  ⚠️  API returned success=false: {data.get('message', 'Unknown error')}")
                    return [], False
            else:
                print(f"  ❌ API error: {response.status_code} - {response.text[:200]}")
                return [], False
        except Exception as e:
            print(f"  ❌ Exception calling API: {e}")
            return [], False
    
    def calculate_metrics(self, recommended: List[str], expected: List[str], all_exhibits: Set[str]) -> Dict:
        """Calculate accuracy metrics"""
        recommended_set = set(recommended)
        expected_set = set(expected)
        
        # True Positives: exhibits that are both recommended and expected
        tp = len(recommended_set & expected_set)
        
        # False Positives: exhibits recommended but not expected
        fp = len(recommended_set - expected_set)
        
        # False Negatives: exhibits expected but not recommended
        fn = len(expected_set - recommended_set)
        
        # True Negatives: exhibits not recommended and not expected
        # (only count if we have expected exhibits to compare against)
        if expected_set:
            tn = len(all_exhibits - recommended_set - expected_set)
        else:
            tn = 0
        
        # Calculate metrics
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0
        
        # Mean Reciprocal Rank (MRR) - if expected exhibits are in results
        mrr = 0.0
        if expected_set and recommended:
            for idx, ex_id in enumerate(recommended):
                if ex_id in expected_set:
                    mrr = 1.0 / (idx + 1)
                    break
        
        # Coverage: percentage of expected exhibits that appear in recommendations
        coverage = tp / len(expected_set) if expected_set else 0.0
        
        return {
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score,
            'accuracy': accuracy,
            'mrr': mrr,
            'coverage': coverage,
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'tn': tn
        }
    
    def calculate_interest_match_score(self, recommended_exhibits: List[Dict], keywords: List[str]) -> float:
        """Calculate how well recommended exhibits match expected keywords"""
        if not keywords or not recommended_exhibits:
            return 0.0
        
        keywords_lower = [k.lower() for k in keywords]
        matches = 0
        
        for ex in recommended_exhibits:
            ex_id = ex.get('id')
            # Find exhibit in all_exhibits
            exhibit = next((e for e in self.all_exhibits if e.get('id') == ex_id), None)
            if not exhibit:
                continue
            
            # Build searchable text
            search_text = ' '.join([
                exhibit.get('name', ''),
                exhibit.get('description', ''),
                exhibit.get('category', ''),
            ]).lower()
            
            # Check if any keyword matches
            if any(kw in search_text for kw in keywords_lower):
                matches += 1
        
        return matches / len(recommended_exhibits) if recommended_exhibits else 0.0
    
    def run_tests(self):
        """Run all test cases and calculate metrics"""
        print("\n" + "=" * 60)
        print("Running Recommendation Accuracy Tests")
        print("=" * 60)
        
        if not self.fetch_all_exhibits():
            print("❌ Cannot proceed without exhibits")
            return False
        
        test_cases = self.create_test_cases()
        print(f"\n📋 Created {len(test_cases)} test cases")
        
        all_exhibit_ids = {ex.get('id') for ex in self.all_exhibits}
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{'='*60}")
            print(f"Test Case {i}: {test_case['name']}")
            print(f"{'='*60}")
            print(f"  User Profile: {json.dumps(test_case['userProfile'], indent=4)}")
            print(f"  Expected Keywords: {test_case.get('expectedKeywords', [])}")
            print(f"  Expected Exhibits (IDs): {test_case.get('expectedExhibitIds', [])[:5]}")
            
            # Call recommendation API
            recommended, success = self.call_recommendation_api(
                test_case['userProfile'],
                test_case['selectedFloor']
            )
            
            if not success:
                print(f"  ❌ Test case failed: Could not get recommendations")
                self.test_results.append({
                    'test_case': test_case,
                    'success': False,
                    'recommended': [],
                    'metrics': {}
                })
                continue
            
            recommended_ids = [ex.get('id') for ex in recommended]
            print(f"  ✅ Received {len(recommended_ids)} recommendations")
            
            # Calculate metrics
            metrics = self.calculate_metrics(
                recommended_ids,
                test_case.get('expectedExhibitIds', []),
                all_exhibit_ids
            )
            
            # Calculate interest match score
            interest_match = self.calculate_interest_match_score(
                recommended,
                test_case.get('expectedKeywords', [])
            )
            metrics['interest_match'] = interest_match
            
            # Calculate relevance score: how many recommended exhibits match keywords
            # This is more lenient than exact ID matching
            if test_case.get('expectedKeywords'):
                relevant_count = 0
                for ex in recommended:
                    ex_id = ex.get('id')
                    exhibit = next((e for e in self.all_exhibits if e.get('id') == ex_id), None)
                    if exhibit:
                        search_text = ' '.join([
                            exhibit.get('name', ''),
                            exhibit.get('description', ''),
                            exhibit.get('category', ''),
                        ]).lower()
                        keywords_lower = [k.lower() for k in test_case.get('expectedKeywords', [])]
                        if any(kw in search_text for kw in keywords_lower):
                            relevant_count += 1
                metrics['relevance_score'] = relevant_count / len(recommended) if recommended else 0.0
            else:
                metrics['relevance_score'] = 0.0
            
            # Store results
            self.test_results.append({
                'test_case': test_case,
                'success': True,
                'recommended': recommended_ids,
                'recommended_exhibits': recommended[:10],  # Store first 10 for display
                'metrics': metrics
            })
            
            # Print metrics
            print(f"  📊 Metrics:")
            print(f"     Precision:  {metrics['precision']:.3f}")
            print(f"     Recall:     {metrics['recall']:.3f}")
            print(f"     F1 Score:   {metrics['f1_score']:.3f}")
            print(f"     Accuracy:   {metrics['accuracy']:.3f}")
            print(f"     MRR:        {metrics['mrr']:.3f}")
            print(f"     Coverage:   {metrics['coverage']:.3f}")
            print(f"     Interest Match: {metrics['interest_match']:.3f}")
        
        # Calculate aggregate metrics
        self.calculate_aggregate_metrics()
        return True
    
    def calculate_aggregate_metrics(self):
        """Calculate aggregate metrics across all test cases"""
        successful_tests = [r for r in self.test_results if r['success']]
        
        if not successful_tests:
            self.metrics = {'error': 'No successful test cases'}
            return
        
        # Average metrics
        avg_precision = sum(r['metrics'].get('precision', 0) for r in successful_tests) / len(successful_tests)
        avg_recall = sum(r['metrics'].get('recall', 0) for r in successful_tests) / len(successful_tests)
        avg_f1 = sum(r['metrics'].get('f1_score', 0) for r in successful_tests) / len(successful_tests)
        avg_accuracy = sum(r['metrics'].get('accuracy', 0) for r in successful_tests) / len(successful_tests)
        avg_mrr = sum(r['metrics'].get('mrr', 0) for r in successful_tests) / len(successful_tests)
        avg_coverage = sum(r['metrics'].get('coverage', 0) for r in successful_tests) / len(successful_tests)
        avg_interest_match = sum(r['metrics'].get('interest_match', 0) for r in successful_tests) / len(successful_tests)
        avg_relevance = sum(r['metrics'].get('relevance_score', 0) for r in successful_tests) / len(successful_tests)
        
        self.metrics = {
            'total_tests': len(self.test_results),
            'successful_tests': len(successful_tests),
            'failed_tests': len(self.test_results) - len(successful_tests),
            'average_precision': avg_precision,
            'average_recall': avg_recall,
            'average_f1_score': avg_f1,
            'average_accuracy': avg_accuracy,
            'average_mrr': avg_mrr,
            'average_coverage': avg_coverage,
            'average_interest_match': avg_interest_match,
            'average_relevance_score': avg_relevance
        }
    
    def generate_report(self):
        """Generate detailed accuracy report"""
        print("\n" + "=" * 60)
        print("ACCURACY REPORT")
        print("=" * 60)
        
        if not self.metrics:
            print("❌ No metrics calculated")
            return
        
        print(f"\n📊 Aggregate Metrics:")
        print(f"   Total Test Cases:      {self.metrics['total_tests']}")
        print(f"   Successful Tests:      {self.metrics['successful_tests']}")
        print(f"   Failed Tests:          {self.metrics['failed_tests']}")
        print(f"   ────────────────────────────────")
        print(f"   Average Precision:     {self.metrics['average_precision']:.3f} ({self.metrics['average_precision']*100:.1f}%)")
        print(f"   Average Recall:        {self.metrics['average_recall']:.3f} ({self.metrics['average_recall']*100:.1f}%)")
        print(f"   Average F1 Score:      {self.metrics['average_f1_score']:.3f} ({self.metrics['average_f1_score']*100:.1f}%)")
        print(f"   Average Accuracy:      {self.metrics['average_accuracy']:.3f} ({self.metrics['average_accuracy']*100:.1f}%)")
        print(f"   Average MRR:           {self.metrics['average_mrr']:.3f} ({self.metrics['average_mrr']*100:.1f}%)")
        print(f"   Average Coverage:      {self.metrics['average_coverage']:.3f} ({self.metrics['average_coverage']*100:.1f}%)")
        print(f"   Average Interest Match: {self.metrics['average_interest_match']:.3f} ({self.metrics['average_interest_match']*100:.1f}%)")
        print(f"   Average Relevance:     {self.metrics['average_relevance_score']:.3f} ({self.metrics['average_relevance_score']*100:.1f}%)")
        
        print(f"\n📋 Detailed Test Results:")
        for i, result in enumerate(self.test_results, 1):
            print(f"\n   Test {i}: {result['test_case']['name']}")
            if result['success']:
                metrics = result['metrics']
                print(f"      ✅ Success")
                print(f"      Recommended: {len(result['recommended'])} exhibits")
                print(f"      Precision: {metrics['precision']:.3f}, Recall: {metrics['recall']:.3f}, F1: {metrics['f1_score']:.3f}")
                print(f"      Relevance: {metrics.get('relevance_score', 0):.3f}, Interest Match: {metrics.get('interest_match', 0):.3f}")
                if result['recommended_exhibits']:
                    print(f"      Top Recommendations:")
                    for j, ex in enumerate(result['recommended_exhibits'][:3], 1):
                        ex_name = ex.get('name', 'Unknown')
                        ex_score = ex.get('score', 0)
                        print(f"         {j}. {ex_name} (Score: {ex_score:.2f})")
                else:
                    print(f"      No recommendations returned")
            else:
                print(f"      ❌ Failed")
        
        # Save report to file
        report_path = os.path.join(ROOT, 'accuracy_report.json')
        report_data = {
            'metrics': self.metrics,
            'test_results': [
                {
                    'test_name': r['test_case']['name'],
                    'success': r['success'],
                    'metrics': r.get('metrics', {}),
                    'recommended_count': len(r.get('recommended', []))
                }
                for r in self.test_results
            ],
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Detailed report saved to: {report_path}")
        
        # Overall assessment - use relevance score which is more meaningful
        # when exact ID matching isn't available
        if self.metrics['average_relevance_score'] > 0:
            overall_score = (
                self.metrics['average_relevance_score'] * 0.4 +
                self.metrics['average_interest_match'] * 0.3 +
                self.metrics['average_precision'] * 0.15 +
                self.metrics['average_recall'] * 0.15
            )
        else:
            overall_score = (
                self.metrics['average_precision'] * 0.25 +
                self.metrics['average_recall'] * 0.25 +
                self.metrics['average_f1_score'] * 0.25 +
                self.metrics['average_interest_match'] * 0.25
            )
        
        print(f"\n{'='*60}")
        print(f"OVERALL ACCURACY SCORE: {overall_score:.3f} ({overall_score*100:.1f}%)")
        print(f"{'='*60}")
        
        if overall_score >= 0.8:
            print("✅ Excellent accuracy!")
        elif overall_score >= 0.6:
            print("⚠️  Good accuracy, but room for improvement")
        else:
            print("❌ Accuracy needs improvement")

def main():
    print("=" * 60)
    print("Exhibit Recommendation Accuracy Tester")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Recommendation Endpoint: {RECOMMEND_URL}")
    print()
    
    tester = RecommendationAccuracyTester()
    
    if not tester.run_tests():
        print("\n❌ Testing failed")
        sys.exit(1)
    
    tester.generate_report()
    print("\n✅ Testing complete!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

